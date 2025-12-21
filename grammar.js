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

function gen_fragment_expr(node) {
    switch (node.kind) {
        case NodeKind.X: return 'x';
        case NodeKind.Y: return 'y';
        case NodeKind.T: return 't';
        case NodeKind.MOUSEX: return 'mouse_x';
        case NodeKind.MOUSEY: return 'mouse_y';
        case NodeKind.NUMBER: return '' + node.number;
        case NodeKind.BOOLEAN: return '' + node.boolean;

        case NodeKind.ABS: return `abs(${gen_fragment_expr(node.inner)})`;
        case NodeKind.ADD: return `(${gen_fragment_expr(node.lhs)} + ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.MULT: return `(${gen_fragment_expr(node.lhs)} * ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.MOD: return `(${gen_fragment_expr(node.lhs)} % ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.GE: return `(${gen_fragment_expr(node.lhs)} >= ${gen_fragment_expr(node.rhs)})`;
        case NodeKind.TRIPLE: {
            let first = gen_fragment_expr(node.first);
            let second = gen_fragment_expr(node.second);
            let third = gen_fragment_expr(node.third);
            return `vec3f(${first}, ${second}, ${third})`;
        }
        case NodeKind.IF: {
            let cond = gen_fragment_expr(node.cond);
            let then = gen_fragment_expr(node.then);
            let elze = gen_fragment_expr(node.elze);
            return `(f32(${cond}) * (${then}) + f32(!(${cond})) * (${elze}))`;
        }
        case NodeKind.RANDOM:
        case NodeKind.RULE:
            throw new Error(`Not a valid runtime kind: ${node.kind}`);
        default:
            throw new Error(`Not implemented: gen_fragment_expr (${node.kind})`);
    }
}

const grammar_branch = (branch, probability) => ({ branch, probability });
const uniform_branches = (...branches) => branches.map(branch => grammar_branch(branch, 1/branches.length));

function random_art(grammar, rule, depth) {
    const branches = grammar[rule];

    let selected;
    if (depth <= 0) {
        selected = branches[0].branch;
    } else {
        let t = Math.random();
        let p = 0;
        for (const { branch, probability } of branches) {
            p += probability;
            if (t <= p) {
                selected = branch;
                break;
            }
        }
    }

    return gen_node(grammar, selected, depth);
}

function gen_node(grammar, node, depth) {    
    switch (node.kind) {
        case NodeKind.X:
        case NodeKind.Y:
        case NodeKind.T:
        case NodeKind.NUMBER:
        case NodeKind.BOOLEAN:
        case NodeKind.MOUSEX:
        case NodeKind.MOUSEY:
            return node;
        case NodeKind.RANDOM:
            return node_number(Math.random()*2-1);

        case NodeKind.ABS: {
            let inner = gen_node(grammar, node.inner, depth);
            return node_abs(inner);
        }
        case NodeKind.ADD:
        case NodeKind.MULT:
        case NodeKind.MOD:
        case NodeKind.GE: {
            let lhs = gen_node(grammar, node.lhs, depth);
            let rhs = gen_node(grammar, node.rhs, depth);
            return node_binop(node.kind)(lhs, rhs);
        }
        case NodeKind.TRIPLE: {
            let first = gen_node(grammar, node.first, depth);
            let second = gen_node(grammar, node.second, depth);
            let third = gen_node(grammar, node.third, depth);
            return node_triple(first, second, third);
        }
        case NodeKind.IF: {
            let cond = gen_node(grammar, node.cond, depth);
            let then = gen_node(grammar, node.then, depth)
            let elze = gen_node(grammar, node.elze, depth);
            return node_cond(cond, then, elze);
        }
        case NodeKind.RULE:
            // The purpose of this loop is to make sure that the expressions do not grow too fast with respect to depth.
            while (depth >= 0 && Math.random() <= 0.5)
                depth -= 1;
            return random_art(grammar, node.rule, depth - 1);
        default:
            throw new Error(`Not implemented: ${node.kind}`);
    }
}
