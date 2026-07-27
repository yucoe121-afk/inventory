// 재고 계산은 전부 "낱개"로 한다.
// 박스와 낱개를 섞어서 더하면 숫자가 틀어지기 때문에,
// 저장/계산은 낱개로만 하고 사람에게 보여줄 때만 박스로 되돌린다.

export type UnitKind = "단위" | "낱개";

export type MovementForStock = {
  direction: "입고" | "출고";
  quantity: number;
  unit_kind: UnitKind;
};

// 기록 한 건의 수량을 낱개로 환산한다.
// 1박스에 30개인 품목이면 "2박스" -> 60개, "3낱개" -> 3개.
export function toPieces(
  quantity: number,
  unitKind: UnitKind,
  countPerUnit: number
) {
  return unitKind === "낱개" ? quantity : quantity * countPerUnit;
}

// 입고는 더하고 출고는 빼서, 남은 낱개 수를 구한다.
export function stockInPieces(
  movements: MovementForStock[],
  countPerUnit: number
) {
  return movements.reduce((sum, movement) => {
    const pieces = toPieces(
      movement.quantity,
      movement.unit_kind,
      countPerUnit
    );
    return sum + (movement.direction === "입고" ? pieces : -pieces);
  }, 0);
}

// 낱개 수를 "2박스 7개"처럼 사람이 읽는 문구로 바꾼다.
// 환산이 필요 없는 품목(1단위 = 1개)은 "7개"처럼 그대로 보여준다.
export function formatPieces(
  pieces: number,
  unit: string,
  countPerUnit: number
) {
  if (countPerUnit <= 1) {
    return `${pieces}${unit}`;
  }

  const sign = pieces < 0 ? "-" : "";
  const absolute = Math.abs(pieces);
  const units = Math.floor(absolute / countPerUnit);
  const rest = absolute % countPerUnit;
  return `${sign}${units}${unit} ${rest}개`;
}
