// Minimal vanilla SPA whose only purpose is to react to network conditions,
// so the e2e tests can assert graceful degradation. No framework, no build.
(function () {
  var view = document.getElementById('view');
  var toast = document.getElementById('toast');
  var banner = document.getElementById('offline-banner');

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
  }

  function setOffline(isOffline) {
    banner.hidden = !isOffline;
  }

  window.addEventListener('offline', function () {
    setOffline(true);
  });
  window.addEventListener('online', function () {
    setOffline(false);
  });

  // Fetch JSON with retry on network error — the resilience behaviour under test.
  function fetchJsonWithRetry(url, options, attempts) {
    attempts = attempts || 3;
    return fetch(url, options).then(
      function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      },
      function (err) {
        if (attempts > 1) return fetchJsonWithRetry(url, options, attempts - 1);
        throw err;
      }
    );
  }

  // --- Pages ---

  function renderDashboard() {
    view.innerHTML = '<div data-cy="spinner">Loading…</div>';
    fetch('/api/dashboard')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        view.innerHTML =
          '<table data-cy="table"><tbody>' +
          '<tr><td>Sales</td><td>' + data.sales + '</td></tr>' +
          '<tr><td>Users</td><td>' + data.users + '</td></tr>' +
          '</tbody></table>';
      })
      .catch(function () {
        view.innerHTML =
          '<div data-cy="error">Something went wrong, please retry</div>';
      });
  }

  function renderProducts() {
    view.innerHTML = '<div data-cy="spinner">Loading…</div>';
    // Retry means transient drops still resolve to a product list.
    fetchJsonWithRetry('/api/products')
      .then(function (data) {
        view.innerHTML =
          '<ul data-cy="product-list">' +
          data.products
            .map(function (p) {
              return '<li data-cy="product">' + p.name + '</li>';
            })
            .join('') +
          '</ul>';
      })
      .catch(function () {
        view.innerHTML =
          '<div data-cy="error">Could not load products</div>';
      });
  }

  function renderCheckout() {
    view.innerHTML =
      '<button data-cy="pay">Pay</button>' +
      '<div data-cy="order-status"></div>';
    var btn = view.querySelector('[data-cy=pay]');
    var status = view.querySelector('[data-cy=order-status]');
    var submitting = false;

    btn.addEventListener('click', function () {
      if (!navigator.onLine) {
        showToast('You are offline');
        return;
      }
      if (submitting) return; // guard against double-submit on slow network
      submitting = true;
      btn.disabled = true;
      status.textContent = 'Placing order…';

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'widget' }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          status.textContent = 'Order placed: ' + data.id;
        })
        .catch(function () {
          showToast('Something went wrong, please retry');
          status.textContent = '';
        })
        .then(function () {
          submitting = false;
          btn.disabled = false;
        });
    });
  }

  function route() {
    toast.hidden = true;
    setOffline(!navigator.onLine);
    var path = window.location.pathname;
    if (path.indexOf('/products') === 0) return renderProducts();
    if (path.indexOf('/checkout') === 0) return renderCheckout();
    return renderDashboard();
  }

  route();
})();
