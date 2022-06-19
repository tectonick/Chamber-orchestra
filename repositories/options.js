const DATES={
    ALL:'all',
    PAST:'past',
    FUTURE:'future'
}
const ORDER={
    ASC:'asc',
    DESC:'desc'
}

const UPDATED_DATE_FORMAT='%Y-%m-%d %H:%i:%s';
const DATE_FORMAT='%Y-%m-%d %H:%i:00';

const sqlSelectDateCondition = (dateType) => {
    switch (dateType) {
        case DATES.ALL:
            return '';
        case DATES.PAST:
            return 'date<NOW()';
        case DATES.FUTURE:
            return 'date>=NOW()';
        default:
            return '';
    }
}
const sqlOrderCondition = (order) => {
    switch (order) {
        case ORDER.ASC:
            return 'ASC';
        case ORDER.DESC:
            return 'DESC';
        default:
            return 'ASC';
    }
}
const sqlHiddenCondition = (hidden) => {
    switch (hidden) {
        case true:
            return '';
        case false:
            return 'hidden=FALSE';
        default:
            return '';
    }
}
module.exports = { DATES, ORDER, sqlSelectDateCondition, sqlOrderCondition, sqlHiddenCondition, UPDATED_DATE_FORMAT, DATE_FORMAT };