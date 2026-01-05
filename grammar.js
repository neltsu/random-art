let i = 0;
const NodeKind = {
    X: i++,
    Y: i++,
    T: i++,
    MOUSEX: i++,
    MOUSEY: i++,

    NUMBER: i++,
    BOOLEAN: i++,
    ABS: i++,

    ADD: i++,
    MULT: i++,
    MOD: i++,
    GE: i++,

    TRIPLE: i++,
    IF: i++,

    RANDOM: i++,
    RULE: i++,
}

const NODE_X = { kind: NodeKind.X };
const NODE_Y = { kind: NodeKind.Y };
const NODE_T = { kind: NodeKind.T };
const NODE_MOUSEX = { kind: NodeKind.MOUSEX };
const NODE_MOUSEY = { kind: NodeKind.MOUSEY };
const NODE_RANDOM = { kind: NodeKind.RANDOM };

const node_number = number => ({ kind: NodeKind.NUMBER, number });
const node_boolean = boolean => ({ kind: NodeKind.BOOLEAN, boolean });
const node_abs = inner => ({ kind: NodeKind.ABS, inner });
const node_rule = rule => ({ kind: NodeKind.RULE, rule });

const node_binop = kind => (lhs, rhs) => ({ kind, lhs, rhs });
const node_add = node_binop(NodeKind.ADD);
const node_mult = node_binop(NodeKind.MULT);
const node_mod = node_binop(NodeKind.MOD);
const node_ge = node_binop(NodeKind.GE);

const node_triple = (first, second, third) => ({ kind: NodeKind.TRIPLE, first, second, third });
const node_cond = (cond, then, elze) => ({ kind: NodeKind.IF, cond, then, elze });

