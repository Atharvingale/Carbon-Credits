const webpack = require('webpack');

module.exports = function override(config) {
  // Add fallbacks for Node.js modules
  // Add resolve alias
  config.resolve.alias = {
    ...config.resolve.alias,
    'process/browser': require.resolve('process'),
    'process/browser.js': require.resolve('process'),
  };
  
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process'),
    vm: false,
    fs: false,
    net: false,
    tls: false,
    os: false,
    path: false,
    zlib: false,
    http: false,
    https: false,
    assert: false,
    url: false,
    util: false,
  };

  // Add plugins to provide global variables
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process',
    }),
  ];

  // Ignore source map warnings for node_modules
  config.ignoreWarnings = [
    function ignoreSourcemapsloaderWarnings(warning) {
      return (
        warning.module &&
        warning.module.resource &&
        warning.module.resource.includes('node_modules') &&
        warning.details &&
        warning.details.includes('source-map-loader')
      );
    },
  ];

  return config;
};
