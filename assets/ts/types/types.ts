import {config_action_mode, config_color_mode, config_tab_mode} from "../definitions/config";
import AbstractDispatcher from "../dispatcher/AbstractDispatcher";

export type TabListTypes = "benchmark" | "labs" | "json";
export type ActionTypes = "opened" | "closed" | "minimize" | "maximize";
export type ColorModeTypes = "dark" | "light";
export type ConfigParams =
    (typeof config_action_mode | typeof config_tab_mode | typeof config_color_mode | "prettify")
    | string;
export type SystemWideProfiler = {
    start_time: number;
    end_time: number;
    end_memory: number;
    duration: number;
    real_end_memory: number;
    peak_memory: number;
    real_peak_memory: number;
    memory_limit: number;
};

export type RecordProfiler = {
    group: number;
    id: number;
    name: string;
    stopped: boolean,
    severity: number;
    left: number;
    timing: {
        start_time: number;
        end_time: number;
        duration: number;
        percentage: number;
    };
    memory: {
        start_memory: number;
        end_memory: number;
        used_memory: number;
        real_start_memory: number;
        real_end_memory: number;
        real_used_memory: number;
    };
    formatted_data: {
        [p: string]: any
    }
};

export type AggregatorProfiler = {
    name: string;
    total_execution: number;
    total_duration: number;
    minimum_duration: number;
    maximum_duration: number;
    average_duration: number;
    records: Array<number>;
};

export type Profiler = {
    severity: number;
    timing: {
        start_time: number;
        end_time: number;
        duration: number;
    };
    memory: {
        start_memory: number;
        end_memory: number;
        used_memory: number;
        real_start_memory: number;
        real_end_memory: number;
        real_used_memory: number;
    };
};

export type JsonProfiler = {
    generated: number; // the unix timestamp when the data was generated
    system_wide: SystemWideProfiler;
    groups: {
        [key: number]: string;
    },
    aggregators: {
        [pkey: number]: AggregatorProfiler;
    },
    records: {
        [key: number]: RecordProfiler;
    },
    profiler: Profiler;
};

export interface AppInterface {
    has_dispatcher(name: string): boolean;

    add_dispatcher(name: string, dispatcher: AbstractDispatcher): any;

    remove_dispatcher(name: string): any;

    /**
     * Get the waterfall element
     */
    get waterfall(): HTMLElement;

    /**
     * Get the current profiler
     */
    get profiler(): JsonProfiler;

    set profiler(json: JsonProfiler);

    /**
     * Set the current profiler
     */
    set_profiler(json: JsonProfiler): any;

    /**
     * Reset the profiler to the original profiler
     */
    reset_profiler(): any;

    /**
     * Get the original profiler
     */
    get_original_profiler(): JsonProfiler | null;

    get original_profiler(): JsonProfiler | null;

    /**
     * Get color mode
     */
    get_color_mode(): ColorModeTypes;

    get color_mode(): ColorModeTypes;

    /**
     * Set color mode
     */
    set_color(mode: ColorModeTypes, save: boolean): any;

    set color_mode(mode: ColorModeTypes);

    /**
     * Get action mode
     */
    get_action(): ActionTypes;

    get action(): ActionTypes;

    /**
     * Set action mode
     */
    set_action(mode: ActionTypes): void;

    set action(mode: ActionTypes);

    /**
     * Get tab mode
     */
    get_tab(): TabListTypes;

    get tab(): TabListTypes;

    set_tab(mode: TabListTypes | HTMLElement): boolean;

    set tab(mode: TabListTypes);

    /**
     * Get previous tab mode
     */
    get_previous_tab(): TabListTypes;

    get previous_tab(): TabListTypes;

    reset_slider_bottom($action_tab?: HTMLElement): void;

    set_message_info(msg: string, type: string, remove: boolean): void;

    /**
     * Dispatch the action
     */
    dispatch(
        {
            profiler,
            action_tab,
            active_tab,
            tabs,
            actions
        }: {
            profiler: JsonProfiler,
            action_tab: HTMLElement,
            active_tab: HTMLElement,
            tabs?: NodeListOf<HTMLElement>,
            actions?: NodeListOf<HTMLElement>
        }
    ): any;

    /**
     * Import json
     */

    import_json(json?: JsonProfiler, tab_element?: HTMLElement): any;

    import_json_file(file: File): any;

    /**
     * Get selector element
     */
    use_element(selector: string): Element;

    /**
     * Get selector elements
     */
    use_elements(selectors: string): NodeListOf<Element>;

    /**
     * Sort tabs
     */
    sort_tabs(tabs: Array<TabListTypes>): any;
}