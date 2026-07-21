export function buildQrCells(n = 11): boolean[] {
  const cells: boolean[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inCorner = (r < 3 && c < 3) || (r < 3 && c >= n - 3) || (r >= n - 3 && c < 3);
      const on = inCorner
        ? !(r % 2 === 1 && c % 2 === 1)
        : (r * 13 + c * 7 + r * c * 3) % 5 === 0;
      cells.push(on);
    }
  }
  return cells;
}
