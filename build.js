const NodeBuild = require('@voliware/node-build');
const version = require('./package.json').version;

// js
const jsInput = [
    './node_modules/@voliware/template2/dist/template2-bundle.min.js',
    './public/js/routes.js',
    './public/js/app.js'
];
const jsOutput = "./public/js/app.min.js"
const jsConfig = {
    name: "node-server JS",
    version: version, 
    input: jsInput,
    output: jsOutput
};

// css
const cssInput = [
    './node_modules/@voliware/template2/dist/template2.min.css',
    './public/css/style.css'
];
const cssOutput = "./public/css/style.min.css";
const cssConfig = {
    name: "node-server CSS",
    version: version,
    input: cssInput,
    output: cssOutput
};

// build
const configs = [jsConfig, cssConfig];
new NodeBuild.Build(configs).run();