module.exports = {
  presets: [
    [
      '@babel/preset-env', {
        targets: {
          node: "10"
        },
        modules: "cjs"
      }
    ]
  ]
};
