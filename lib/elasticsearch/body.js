import getFunctionScores from './score';
import getMultiMatchConfig from './multimatch';
import getBoosts from './boost';
import cloneDeep from 'clone-deep';
/**
 * Class to create elasticsearch request body in modular and reproductive way
 */
export default class RequestBody {
    constructor({ config, queryChain, searchQuery, customFilters }) {
        /**
         * @var {string[]} rangeOperators Possible range operators
         */
        this.rangeOperators = ['gt', 'lt', 'gte', 'lte', 'moreq', 'from', 'to'];
        /**
         * @var {string[]} orRangeOperators Possible range operators with or clause prefix
         */
        this.orRangeOperators = this.rangeOperators.map(o => 'or' + o.charAt(0).toUpperCase() + o.substr(1));
        /**
         * @param {Object} value Get first option of filter values
         */
        this.extractFirstValueMutator = (value) => {
            value = value[Object.keys(value)[0]];
            if (!Array.isArray(value) && value !== null) {
                value = [value];
            }
            return value;
        };
        /**
         * @var {FiltersInterface} baseFilters Operators for the default filters like: range, or, nor, in, nin
         */
        this.baseFilters = {
            range: {
                check: ({ value }) => Object.keys(value).every(v => this.rangeOperators.includes(v)),
                filter: ({ attribute, value, queryChain }) => queryChain.filter('range', attribute, value)
            },
            orRange: {
                check: ({ value }) => Object.keys(value).every(o => this.orRangeOperators.includes(o)),
                filter: ({ attribute, value, queryChain }) => {
                    for (let o in value) {
                        const realOperator = o.substr(2).toLowerCase();
                        value[realOperator] = value[o];
                        delete value[o];
                    }
                    return queryChain.orFilter('range', attribute, value);
                }
            },
            or: {
                check: ({ operator }) => operator === 'or',
                filter: ({ value, attribute, queryChain }) => {
                    if (value === null) {
                        return queryChain.orFilter('bool', b => {
                            return b.notFilter('exists', attribute);
                        });
                    }
                    else {
                        return queryChain.orFilter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            nor: {
                check: ({ operator }) => operator === 'nor',
                filter: ({ value, attribute, queryChain }) => {
                    if (value === null) {
                        return queryChain.orFilter('exists', attribute);
                    }
                    else {
                        return queryChain.orFilter('bool', b => {
                            return b.notFilter('terms', attribute, value);
                        });
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            nin: {
                check: ({ operator }) => ['neq', 'nin'].includes(operator),
                filter: ({ value, attribute, queryChain }) => {
                    if (value === null) {
                        return queryChain.notFilter('exists', attribute);
                    }
                    else {
                        return queryChain.notFilter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            },
            in: {
                check: ({ operator }) => ['eq', 'in'].includes(operator),
                filter: ({ value, attribute, queryChain }) => {
                    if (value === null) {
                        return queryChain.filter('exists', attribute);
                    }
                    else {
                        return queryChain.filter('terms', attribute, value);
                    }
                },
                mutator: this.extractFirstValueMutator
            }
        };
        this.customFilters = {};
        this.optionsPrefix = '_options';
        this.catalogFilterBuilder = (filterQr, filter, attrPostfix = '', type = 'filter') => {
            let { value, attribute } = filter;
            const valueKeys = value !== null ? Object.keys(value) : [];
            if (this.checkIfObjectHasScope({ object: filter, scope: 'catalog' }) && valueKeys.length > 0) {
                const isRange = valueKeys.filter(value => this.rangeOperators.indexOf(value) !== -1);
                if (isRange.length) {
                    let rangeAttribute = attribute;
                    // filter by product fiunal price
                    if (rangeAttribute === 'price') {
                        rangeAttribute = this.config.products.priceFilterKey;
                    }
                    // process range filters
                    filterQr = filterQr[type]('range', rangeAttribute, value);
                }
                else {
                    // process terms filters
                    let newValue = value[Object.keys(value)[0]];
                    if (!Array.isArray(newValue)) {
                        newValue = [newValue];
                    }
                    if (attrPostfix === '') {
                        filterQr = filterQr[type]('terms', this.getMapping(attribute), newValue);
                    }
                    else {
                        filterQr = filterQr[type]('terms', attribute + attrPostfix, newValue);
                    }
                }
            }
            return filterQr;
        };
        /**
         * Get an empty representation of the bodybuilder query-chain without need to import bodybuilder itself
         * @return {any}
         */
        this.bodybuilder = () => this.emptyQueryChain.clone();
        this.config = config;
        this.queryChain = queryChain;
        this.searchQuery = searchQuery;
        this.customFilters = Object.assign({}, this.customFilters, customFilters);
        this.emptyQueryChain = queryChain.clone();
    }
    /**
     * @return {this}
     */
    buildQueryBodyFromSearchQuery() {
        if (this.searchQuery.getAppliedFilters().length > 0) {
            this.appliedFilters = cloneDeep(this.searchQuery.getAppliedFilters());
            this
                .applyBaseFilters()
                .applyCatalogFilters()
                .applyAggregations()
                .applyTextQuery()
                .applySort();
        }
        return this;
    }
    /**
     * Apply all `default` scoped filters to `queryChain`
     * @return {this}
     */
    applyBaseFilters() {
        this.appliedFilters.forEach(filter => {
            let { value, attribute } = filter;
            if (!this.checkIfObjectHasScope({ object: filter, scope: 'default' })) {
                return;
            }
            value = typeof value === 'object' ? value : { 'in': [value] };
            if (Object.keys(value).length > 0) {
                attribute = this.getMapping(attribute);
                const operator = Object.keys(value)[0];
                const sortedFilters = this.getSortedFilters();
                for (let filterHandler of sortedFilters) {
                    const { queryChain } = this;
                    // Add `queryChain` variable for custom filters
                    if (filterHandler.check({ operator, attribute, value, queryChain })) {
                        value = filterHandler.hasOwnProperty('mutator') ? filterHandler.mutator(value) : value;
                        this.queryChain = filterHandler.filter.call(this, { operator, attribute, value, queryChain });
                        return;
                    }
                }
                // add filter attribute that is not handled by sortedFilters list
                this.queryChain = this.queryChain.filter('terms', attribute, this.extractFirstValueMutator(value));
            }
        });
        return this;
    }
    /**
     * Apply all `catalog` scoped filters to `queryChain`
     * @return {this}
     */
    applyCatalogFilters() {
        if (this.hasCatalogFilters()) {
            this.queryChain.filterMinimumShouldMatch(1);
            const catalogFilters = this.appliedFilters.filter(object => this.checkIfObjectHasScope({ object, scope: 'catalog' }));
            catalogFilters.forEach(filter => {
                this.queryChain.filter('bool', catalogFilterQuery => {
                    return this.catalogFilterBuilder(catalogFilterQuery, filter, undefined, 'orFilter')
                        .orFilter('bool', b => this.catalogFilterBuilder(b, filter, this.optionsPrefix).filter('match', 'type_id', 'configurable'));
                });
            });
        }
        return this;
    }
    hasCatalogFilters() {
        if (!this._hasCatalogFilters) {
            this._hasCatalogFilters = this.searchQuery.getAppliedFilters()
                .some(object => this.checkIfObjectHasScope({ object, scope: 'catalog' }));
        }
        return this._hasCatalogFilters;
    }
    /**
     * Apply filter aggregations
     * @return {this}
     */
    applyAggregations() {
        const filters = this.searchQuery.getAvailableFilters();
        const config = this.config.products;
        if (filters.length > 0) {
            for (let attribute of filters) {
                if (this.checkIfObjectHasScope({ object: attribute, scope: 'catalog' })) {
                    const { field } = attribute;
                    const options = attribute.options || {};
                    if (field !== 'price') {
                        let aggregationSize = { size: options.size || config.filterAggregationSize[field] || config.filterAggregationSize.default };
                        this.queryChain
                            .aggregation('terms', this.getMapping(field), aggregationSize)
                            .aggregation('terms', field + this.optionsPrefix, aggregationSize);
                    }
                    else {
                        const appliedPriceFilter = this.appliedFilters.find(filter => filter.attribute === 'price');
                        const additionalPriceAggregations = [];
                        if (appliedPriceFilter && appliedPriceFilter.value && (appliedPriceFilter.value.gte || appliedPriceFilter.value.lte)) {
                            additionalPriceAggregations.push(Object.assign(Object.assign({}, (appliedPriceFilter.value.gte ? { from: appliedPriceFilter.value.gte } : {})), (appliedPriceFilter.value.lte ? { to: appliedPriceFilter.value.lte } : {})));
                        }
                        this.queryChain
                            .aggregation('terms', field)
                            .aggregation('range', 'price', {
                            ranges: [
                                ...config.priceFilters.ranges,
                                ...additionalPriceAggregations
                            ]
                        });
                        if (this.config.products && this.config.products.aggregate) {
                            if (this.config.products.aggregate.maxPrice) {
                                this.queryChain.aggregation('max', 'price');
                            }
                            if (this.config.products.aggregate.minPrice) {
                                this.queryChain.aggregation('min', 'price');
                            }
                        }
                    }
                }
            }
        }
        return this;
    }
    /**
     * Apply query string
     * @return {this}
     */
    applyTextQuery() {
        if (this.getSearchText() !== '') {
            let functionScore = getFunctionScores(this.config);
            // Build bool or function_score accordingly
            if (functionScore) {
                this.queryChain.query('function_score', functionScore, this.getQueryBody.bind(this));
            }
            else {
                this.queryChain.query('bool', this.getQueryBody.bind(this));
            }
        }
        return this;
    }
    /**
     * @return {this}
     */
    applySort() {
        if (this.searchQuery.hasAppliedSort()) {
            const appliedSort = this.searchQuery.getAppliedSort();
            const isRandomSort = appliedSort.some(f => f.field === 'random');
            if (isRandomSort) {
                // This is kind of a hack to get random sorting using `bodybuilder`
                const functions = [Object.assign({ 'weight': 2, 'random_score': {} }, this.queryChain.build()['query']['bool'])];
                this.queryChain = this.bodybuilder().query('function_score', { functions, 'min_score': 1.1 });
            }
            else {
                let sorting = [];
                for (let sort of appliedSort) {
                    const { field, options } = sort;
                    sorting.push({ [field]: options });
                }
                this.queryChain.sort(sorting);
            }
        }
        return this;
    }
    /**
     * Combine and sort filters by priority
     */
    getSortedFilters() {
        let filters = Object.values(Object.assign(this.baseFilters, this.customFilters));
        return filters
            .map((filter, index) => {
            if (!filter.priority) {
                filter.priority = (index + 1) * 10;
            }
            return filter;
        })
            .sort(function (a, b) {
            const priorityA = a.priority || 10;
            const priorityB = b.priority || 10;
            if (priorityA === priorityB) {
                return 0;
            }
            else {
                return (priorityA < priorityB) ? -1 : 1;
            }
        });
    }
    checkIfObjectHasScope({ object, scope }) {
        return object.scope === scope || (Array.isArray(object.scope) && object.scope.indexOf(scope) >= 0);
    }
    getMapping(attribute, entityType = 'products') {
        let mapping = [];
        if (this.config.hasOwnProperty(entityType) && this.config[entityType].hasOwnProperty('filterFieldMapping')) {
            mapping = this.config[entityType].filterFieldMapping;
        }
        if (mapping.hasOwnProperty(attribute)) {
            return mapping[attribute];
        }
        return attribute;
    }
    getQueryBody(body) {
        const queryText = this.getSearchText();
        let searchableFields = [];
        let searchableAttributes = this.config.elasticsearch.hasOwnProperty('searchableAttributes')
            ? this.config.elasticsearch.searchableAttributes : { 'name': { 'boost': 1 } };
        for (const attribute of Object.keys(searchableAttributes)) {
            searchableFields.push(attribute + '^' + getBoosts(this.config, attribute));
        }
        return body
            .orQuery('multi_match', 'fields', searchableFields, getMultiMatchConfig(this.config, queryText))
            .orQuery('bool', b => b.orQuery('terms', 'configurable_children.sku', queryText.split('-'))
            .orQuery('match_phrase', 'sku', { query: queryText, boost: 1 })
            .orQuery('match_phrase', 'configurable_children.sku', { query: queryText, boost: 1 }));
    }
    getSearchText() {
        return this.searchQuery.getSearchText();
    }
    getQueryChain() {
        return this.queryChain;
    }
    /**
     * @returns Bodybuilder object
     */
    build() {
        return this.queryChain.build();
    }
}
//# sourceMappingURL=body.js.map