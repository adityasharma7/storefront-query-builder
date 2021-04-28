export default class SearchQuery {
    constructor(queryObj) {
        if (!queryObj) {
            queryObj = { _availableFilters: [], _appliedFilters: [], _appliedSort: [], _searchText: '' };
        }
        this._availableFilters = queryObj._availableFilters || [];
        this._appliedFilters = queryObj._appliedFilters || [];
        this._appliedSort = queryObj._appliedSort || [];
        this._searchText = queryObj._searchText || '';
    }
    /**
      * @return {Array} array of all available filters objects
      */
    getAvailableFilters() {
        return this._availableFilters;
    }
    /**
      * @return {Array} array of applied filters objects
      */
    getAppliedFilters() {
        return this._appliedFilters;
    }
    /**
      * @return {Array} array of applied sort objects
      */
    getAppliedSort() {
        return this._appliedSort;
    }
    /**
      * @return {Array} check if sort options are added
      */
    hasAppliedSort() {
        return this._appliedSort.length > 0;
    }
    /**
      * @return {String}
      */
    getSearchText() {
        return this._searchText;
    }
    /**
      * @param {Object}
      * @return {Object}
      */
    applyFilter({ key, value, scope = 'default', options = Object }) {
        this._appliedFilters.push({
            attribute: key,
            value: value,
            scope: scope,
            options: options
        });
        return this;
    }
    /**
      * @param {Object}
      * @return {Object}
      */
    applySort({ field, options = 'asc' }) {
        this._appliedSort.push({ field, options });
        return this;
    }
    /**
      * @param {Object}
      * @return {Object}
      */
    addAvailableFilter({ field, scope = 'default', options = {} }) {
        // value can has only String, Array or numeric type
        this._availableFilters.push({
            field: field,
            scope: scope,
            options: options
        });
        return this;
    }
    /**
    * @param {Array} filters
    * @return {Object}
    */
    setAvailableFilters(filters) {
        this._availableFilters = filters;
        return this;
    }
    /**
    * @param {String} searchText
    * @return {Object}
    */
    setSearchText(searchText) {
        this._searchText = searchText;
        return this;
    }
}
//# sourceMappingURL=SearchQuery.js.map