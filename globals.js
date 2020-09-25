
const languages = {
    ru:1,
    en:2,
    by:3,
    de:4,

    getNameById:function (value) {
        return Object.keys(this).find(key => this[key] === value);
    }
}


module.exports={languages}