import { applySearchQuery, applySort, buildQueryBodyFromFilterObject, buildQueryBodyFromSearchQuery } from './elasticsearch/index';
import SearchQuery from './types/SearchQuery';
const elasticsearch = {
    buildQueryBodyFromFilterObject,
    buildQueryBodyFromSearchQuery,
    applySearchQuery,
    applySort
};
export { SearchQuery, elasticsearch };
//# sourceMappingURL=index.js.map