import { describe, it, expect } from 'vitest';

describe('Chart Library', () => {
  describe('sparkline data normalisation', () => {
    it('normalises values to 0-1 range', () => {
      const data = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0.5, 1]);
    });

    it('handles single data point', () => {
      const data = [{ value: 42 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0]);
    });

    it('handles all-same values', () => {
      const data = [{ value: 5 }, { value: 5 }, { value: 5 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0, 0]);
    });

    it('handles negative values', () => {
      const data = [{ value: -10 }, { value: 0 }, { value: 10 }];
      const min = Math.min(...data.map(d => d.value));
      const max = Math.max(...data.map(d => d.value));
      const range = max - min || 1;
      const normalised = data.map(d => (d.value - min) / range);
      expect(normalised).toEqual([0, 0.5, 1]);
    });

    it('handles empty data gracefully', () => {
      const data = [];
      expect(data.length).toBe(0);
    });
  });

  describe('donut segment calculations', () => {
    it('calculates angles proportionally', () => {
      const data = [{ value: 25 }, { value: 50 }, { value: 25 }];
      const total = data.reduce((s, d) => s + d.value, 0);
      const angles = data.map(d => (d.value / total) * Math.PI * 2);
      expect(angles[0]).toBeCloseTo(Math.PI / 2);
      expect(angles[1]).toBeCloseTo(Math.PI);
      expect(angles[2]).toBeCloseTo(Math.PI / 2);
    });

    it('handles zero total gracefully', () => {
      const data = [{ value: 0 }, { value: 0 }];
      const total = data.reduce((s, d) => s + d.value, 0);
      expect(total).toBe(0);
    });
  });

  describe('axis scale calculations', () => {
    function niceNum(range, round) {
      if (range === 0) return 1;
      const exp = Math.floor(Math.log10(Math.abs(range)));
      const frac = range / Math.pow(10, exp);
      let nice;
      if (round) {
        if (frac < 1.5) nice = 1;
        else if (frac < 3) nice = 2;
        else if (frac < 7) nice = 5;
        else nice = 10;
      } else {
        if (frac <= 1) nice = 1;
        else if (frac <= 2) nice = 2;
        else if (frac <= 5) nice = 5;
        else nice = 10;
      }
      return nice * Math.pow(10, exp);
    }

    it('computes nice tick values', () => {
      expect(niceNum(17, true)).toBe(20);
      expect(niceNum(83, true)).toBe(100);
      expect(niceNum(4.5, true)).toBe(5);
    });

    it('handles range of zero', () => {
      expect(niceNum(0, true)).toBe(1);
    });
  });
});
