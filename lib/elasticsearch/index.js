var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Body from './body';
import SearchQuery from '../types/SearchQuery';
/**
 * Create a query elasticsearch request body based on a `SearchQuery`
 * @return {Object} Elasticsearch request body
 */
export function buildQueryBodyFromSearchQuery({ config, queryChain, searchQuery, customFilters }) {
    return __awaiter(this, void 0, void 0, function* () {
        const filter = new Body({ config, queryChain, searchQuery, customFilters });
        return filter.buildQueryBodyFromSearchQuery().build();
    });
}
/**
 * Apply a search-text string to query (for string-based searches in, like in VSF search-box)-
 * This will create a set of filters based on your attributes set in API's search configs.
 * @return {Object} `bodybuilder` query chain
 */
export function applySearchQuery({ config, queryText, queryChain }) {
    const searchQuery = new SearchQuery({ _searchText: queryText });
    return new Body({ config, searchQuery, queryChain }).buildQueryBodyFromSearchQuery().getQueryChain();
}
/**
 * Apply simple, single-lined sort arguments to query
 * @return {Object} `bodybuilder` query chain
 */
export function applySort({ sort, queryChain }) {
    if (sort) {
        Object.keys(sort).forEach((key) => {
            queryChain.sort(key, sort[key]);
        });
    }
    return queryChain;
}
/**
 * Build a elasticsearch request-body from unified query object (as known from `storefront-api`) - eg: `{ "type_id": { "eq": "configurable "} }`
 * @return {Object} Elasticsearch request body
 */
export function buildQueryBodyFromFilterObject({ config, queryChain, filter, sort, search = '' }) {
    return __awaiter(this, void 0, void 0, function* () {
        function processNestedFieldFilter(attribute, value) {
            let processedFilter = {
                'attribute': attribute,
                'value': value
            };
            let filterAttributeKeys = Object.keys(value);
            for (let filterAttributeKey of filterAttributeKeys) {
                if (value[filterAttributeKey] && !Array.isArray(value[filterAttributeKey]) && typeof value[filterAttributeKey] === 'object') {
                    processedFilter = processNestedFieldFilter(attribute + '.' + filterAttributeKey, value[filterAttributeKey]);
                }
            }
            return processedFilter;
        }
        const appliedFilters = [];
        if (filter) {
            for (var attribute in filter) {
                let processedFilter = processNestedFieldFilter(attribute, filter[attribute]);
                let appliedAttributeValue = processedFilter['value'];
                const scope = appliedAttributeValue.scope || 'default';
                delete appliedAttributeValue.scope;
                appliedFilters.push({
                    attribute: processedFilter['attribute'],
                    field: processedFilter['attribute'],
                    value: appliedAttributeValue,
                    scope: scope
                });
            }
        }
        return buildQueryBodyFromSearchQuery({
            config,
            queryChain,
            searchQuery: new SearchQuery({
                _appliedFilters: appliedFilters,
                _availableFilters: appliedFilters,
                _appliedSort: sort,
                _searchText: search
            })
        });
    });
}
//# sourceMappingURL=index.js.map