"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
import index_1 from './elasticsearch/index';
var SearchQuery_1 = __importDefault(require("./types/SearchQuery"));
export const SearchQuery = SearchQuery_1.default;
var elasticsearch = {
    buildQueryBodyFromFilterObject: index_1.buildQueryBodyFromFilterObject,
    buildQueryBodyFromSearchQuery: index_1.buildQueryBodyFromSearchQuery,
    applySearchQuery: index_1.applySearchQuery,
    applySort: index_1.applySort
};
export { elasticsearch };