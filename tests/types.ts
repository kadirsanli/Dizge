import D, { data, ui, stats, Operation } from '../dizge';
const rows = [{ name: 'A', value: 2 }];
const derived = data(rows).derive({ doubled: r => r.value * 2 }).select('doubled');
const n: number = derived.toArray()[0].doubled;
const table = ui.table({ rows, columns: [{ key: 'value', format: value => String(value) }] });
ui.app(document.body).use(table);
stats.summary(new Float64Array([1, 2]));
const ops: Operation[] = [{ type: 'filter', key: 'value', operator: 'gt', value: n }];
D.analyze(rows, ops);
D.csv.parse('x\n1')[0].x.toUpperCase();
D.csv.parse('1,2', { header: false })[0][0].toUpperCase();
// @ts-expect-error typed columns reject misspellings
data(rows).select('missing');
// @ts-expect-error invalid direction
data(rows).sort('value', 'up');
