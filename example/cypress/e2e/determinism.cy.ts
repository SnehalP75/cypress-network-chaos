import { seededRng, mulberry32 } from 'cypress-network-chaos';

describe('seeded determinism', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = Array.from({ length: 10 }, mulberry32(42));
    const b = Array.from({ length: 10 }, mulberry32(42));
    expect(a).to.deep.equal(b);
  });

  it('produces a different sequence for a different seed', () => {
    const a = Array.from({ length: 10 }, mulberry32(42));
    const b = Array.from({ length: 10 }, mulberry32(43));
    expect(a).to.not.deep.equal(b);
  });

  it('scopes streams per pattern so two commands do not share one sequence', () => {
    const forApi = Array.from({ length: 5 }, seededRng(42, '/api/a'));
    const forOther = Array.from({ length: 5 }, seededRng(42, '/api/b'));
    expect(forApi).to.not.deep.equal(forOther);
  });
});
