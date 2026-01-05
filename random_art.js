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
