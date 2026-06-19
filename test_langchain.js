const langchain = require('langchain');
console.log(Object.keys(langchain).filter(k => k.toLowerCase().includes('agent')));
