const WIDTH = 800;
const HEIGHT = 800;
const DEPTH = 30;

const canvas = document.getElementById('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;

// (x, y) => [x, x, x]
const gradient = node_triple(NODE_X, NODE_X, NODE_X);

// (x, y) => x*y >= 0 ? [x, y, 1] : [x%y, x%y, x%y]
const cool = node_cond(
    node_ge(
        node_mult(NODE_X, NODE_Y),
        node_number(0)
    ),
    node_triple(NODE_X, NODE_Y, node_number(1)),
    node_triple(_r = node_mod(NODE_X, NODE_Y), _r, _r),
);

const RULE_A = node_rule('A');
const RULE_C = node_rule('C');
const GRAMMAR = {
    E: uniform_branches(node_triple(RULE_C, RULE_C, RULE_C)),
    A: uniform_branches(NODE_X, NODE_Y, NODE_T, NODE_MOUSEX, NODE_MOUSEY, NODE_RANDOM),
    C: uniform_branches(
        RULE_A,
        node_abs(RULE_C),
        node_add(RULE_C, RULE_C),
        node_mult(RULE_C, RULE_C),
    ),
};

const random = random_art(GRAMMAR, 'E', DEPTH);

render_wgpu(gen_fragment_expr(random), canvas);
