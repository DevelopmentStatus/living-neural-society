module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['> 1%', 'last 2 versions', 'not ie 11']
        },
        useBuiltIns: 'usage',
        corejs: 3
      }
    ],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ]
}; 