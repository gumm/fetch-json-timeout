// rollup.config.js
// import resolve from '@rollup/plugin-node-resolve';


export default [
  {
    input: 'main.js',
    external: ['base-64', 'node-fetch'],
    // plugins: [
    //   resolve()
    // ],
    output: {
      file: 'dist/cjs/main.js',
      format: 'cjs',
      name: 'json-fetch-timout',
      exports: 'default',
      outro: 'module.exports = Object.assign({}, module.exports, exports);'
    }
  }
];