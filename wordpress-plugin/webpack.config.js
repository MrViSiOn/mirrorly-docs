const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      'admin': './assets/js/admin.js',
      'frontend': './assets/js/frontend.js',
      'admin-style': './assets/css/admin.css',
      'frontend-style': './assets/css/frontend.css'
    },
    output: {
      path: path.resolve(__dirname, 'mirrorly/assets/dist'),
      filename: 'js/[name].min.js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/[name].min.css'
      })
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction
            }
          }
        })
      ]
    },
    devtool: isProduction ? false : 'source-map',
    watch: !isProduction,
    watchOptions: {
      ignored: /node_modules/,
      poll: 1000
    }
  };
};