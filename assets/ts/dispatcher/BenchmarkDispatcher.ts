import {AppInterface, JsonProfiler, RecordProfiler} from "../types/types";
import {
    create_element,
    dispatch_event,
    icon,
    is_function,
    is_numeric_integer,
    is_string,
    select_element
} from "../definitions/functions";
import recordsTemplate from "../templates/tabs/records.sqrl";
import recordTemplate from "../templates/tabs/content/record.sqrl";
import {severity_list} from "../definitions/config";
import AbstractDispatcher from "./AbstractDispatcher";
import {load} from "../definitions/squirrel";
import * as sea from "node:sea";

// max batch append for records
const max_batch_append = 50;
let timeoutBenchmark: any = null;
let resolveCallback: Function = null;
const clear_timeout = (e: CustomEvent) => {
    if (!timeoutBenchmark || e.detail?.tab === 'benchmark') {
        return;
    }
    clearTimeout(timeoutBenchmark);
    timeoutBenchmark = null;
    if (is_function(resolveCallback)) {
        resolveCallback();
        resolveCallback = null;
    }
}

export default class BenchmarkDispatcher extends AbstractDispatcher {
    constructor() {
        super();
    }

    dispatch({profiler, tab_element, app}: {
        profiler: JsonProfiler;
        tab_element: HTMLElement,
        app: AppInterface
    }): any {
        if (timeoutBenchmark) {
            clearTimeout(timeoutBenchmark);
            timeoutBenchmark = null;
            if (resolveCallback) {
                resolveCallback();
                resolveCallback = null;
            }
        }
        let {
            content,
            waterfall
        } = this.withWaterfallContent({
            profiler,
            tab_element,
            expect: 'benchmark',
            template: recordsTemplate
        });

        if (!waterfall || !content) {
            return;
        }

        content.innerHTML = `<waterfall-record-wait>Please Wait</waterfall-record-wait>`;
        const filterElement = select_element(
            'waterfall-filter-list waterfall-action[data-filter][data-status="active"]',
            waterfall
        ) as HTMLElement; // filter element
        const searchElement = select_element('waterfall-search', waterfall); // search element
        const searchInput = searchElement?.querySelector('input'); // search input
        let severity: string = filterElement?.getAttribute('data-filter');
        severity = severity === undefined ? null : severity;
        let aggregatorsElement = select_element('waterfall-aggregators', waterfall);
        let search: string = searchInput?.value.trim();
        if (!aggregatorsElement && searchElement) {
            aggregatorsElement = create_element('waterfall-aggregators');
            searchElement.append(aggregatorsElement);
        }

        // add event listener clear
        waterfall.removeEventListener('waterfall:tab', clear_timeout);
        waterfall.addEventListener('waterfall:tab', clear_timeout);
        const recordFilters: {
            [p: number]: boolean
        } = {};
        const aggregatorList: {
            [p: number]: boolean
        } = {};
        aggregatorsElement?.querySelectorAll('record-aggregator[data-status="active"]').forEach((el: HTMLElement) => {
            let id: string | number = el.getAttribute('data-id');
            if (!is_numeric_integer(id)) {
                return;
            }
            id = Number(id);
            const aggregatorRecords = profiler.aggregators[id]?.records;
            if (!Array.isArray(aggregatorRecords)) {
                return;
            }
            aggregatorList[id] = true;
            aggregatorRecords.forEach((record) => {
                recordFilters[record] = true;
            })
        });
        aggregatorsElement?.replaceChildren('');
        Promise.all([
            new Promise((resolve) => {
                if (aggregatorsElement) {
                    for (let id in profiler.aggregators) {
                        const aggregator = profiler.aggregators[id];
                        if (!aggregator) {
                            continue;
                        }
                        const element = create_element('record-aggregator', {
                            'data-id': id,
                            'data-count': aggregator.records.length,
                            title: aggregator.name + ' with ' + aggregator.records.length + ' records',
                            html: aggregator.name + " (" + aggregator.records.length + ")",
                            'data-status': aggregatorList[Number(id)] ? 'active' : null
                        });
                        aggregatorsElement.append(element);
                    }
                }
                resolve(null);
            }),
            new Promise((resolve) => {
                let severityList = severity ? severity_list[severity] : null;
                severityList = Array.isArray(severityList) ? severityList : null;
                search = is_string(search) ? search.trim().toLowerCase().replace(/\s+/g, '') : null;
                const useAggregatorFilter = filterElement && Object.keys(recordFilters).length > 0;
                const create_html = (record: RecordProfiler): HTMLElement => {
                    return create_element('div', {
                        html: load(recordTemplate, {json: profiler, record})
                    }).children[0] as HTMLElement;
                }
                const needFiltering = useAggregatorFilter || search || severityList;
                content.replaceChildren('');
                let records: Array<any> = [];
                let empty = true;
                let inc = 0;
                const push = (record: RecordProfiler) => {
                    empty = false;
                    let html = create_html(record);
                    // @ts-expect-error ignore
                    html['layer'] = inc++;
                    records.push(html);
                }
                let searchId = null;
                let searchByName = null;
                let searchByGroup = null;
                if (search) {
                    let match = search.match(/\s*id:\s*([0-9]+)?\s*$/);
                    if (match) {
                        searchId = match[1].trim();
                    }
                    let matchName = search.match(/\s*name:\s*((?!(?:group|id|name):).+)?\s*$/);
                    if (matchName) {
                        searchByName = matchName[1].replace(/\s+/g, '').trim().toLowerCase();
                    }
                    let matchGroup = search.match(/\s*group:\s*((?!(?:group|id|name):).+)?\s*$/);
                    if (matchGroup) {
                        searchByGroup = matchGroup[1].replace(/\s+/g, '').trim().toLowerCase();
                    }
                }
                for (let id in profiler.records) {
                    const record = profiler.records[id];
                    if (!record) {
                        continue;
                    }
                    if (!needFiltering) {
                        push(record);
                        continue;
                    }
                    let name = record.name.replace(/\s+/g, '').toLowerCase()
                    let group = profiler.groups[record.group].replace(/\s+/g, '').toLowerCase();
                    let searchName = search
                        ? (name + ' ' + group)
                        : null;
                    if (useAggregatorFilter && !recordFilters[id]
                        || (severityList && !severityList.includes(record.severity))
                    ) {
                        continue;
                    }

                    if (searchId !== null) {
                        if (searchId !== '' && !id.includes(searchId)) {
                            continue;
                        }
                    }
                    if (searchByName !== null) {
                        if (searchByName !== '' && !name.includes(searchByName)) {
                            continue;
                        }
                    }
                    if (searchByGroup !== null) {
                        if (searchByGroup !== '' && !group.includes(searchByGroup)) {
                            continue;
                        }
                    }
                    if (searchId === null && searchByName === null && searchByGroup === null) {
                        if (search && !searchName.includes(search)) {
                            continue;
                        }
                    }
                    push(record);
                }
                if (empty) {
                    content.innerHTML = `<waterfall-record-empty>No records found</waterfall-record-empty>`;
                    resolve(null);
                } else {
                    resolveCallback = resolve;
                    const append = () => {
                        let appends = [];
                        while (records.length > 0 && appends.length < max_batch_append) {
                            appends.push(records.shift());
                        }
                        if (appends.length === 0) {
                            resolveCallback = null;
                            console.debug('Benchmark records loaded');
                            dispatch_event('waterfall:benchmark:dispatched', {profiler, tab_element}, app.waterfall);
                            resolve(null);
                            return;
                        }
                        content.append(...appends);
                        timeoutBenchmark = setTimeout(append, 0);
                    }
                    append();
                }
            }),
        ]).catch((err) => {
            console.error('Benchmark records failed to load', err);
        });
    }

    icon(): SVGElement | null {
        let div = create_element('div', {
            html: icon('rocket')
        });
        return div.firstElementChild as SVGElement;
    }

    name(): string {
        return 'Benchmark';
    }
}
