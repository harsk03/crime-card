// craco.config.js
module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        // Exclude jspdf from source-map-loader
        webpackConfig.module.rules.push({
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
          exclude: [/node_modules\/jspdf/]
        });
        return webpackConfig;
      }
    }
  };