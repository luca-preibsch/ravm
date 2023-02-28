const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TransformJson = require('transform-json-webpack-plugin')
const package = require('./package.json')

/**
 * Disclaimer:
 * Due the html-loader not working for a webpack - webextension setup
 * (html files would have to be loaded, but also exist as actual html files in the build),
 * html files have to be treated as assets and files contained in the html file (svgs, scripts, ...) have to be manually
 * put into the build folder at the correct destination.
 * 
 * I chose to use the CopyWebpackPlugin for static things like svgs and to treat needed scripts as their own
 * entry points with webpack.
 */

const mode = 'development'

// 'inline-source-map'
const devtool = "cheap-module-source-map"

const _resolve = {
  extensions: ['.js'],
  modules: [
    path.resolve(__dirname, 'node_modules'),
    'node_modules'
  ]
}

const _module = {
  rules: [
    {
      test: /\.css$/i,
      use: ["style-loader", "css-loader"],
    },
    {
      test: /\.der/,
      type: 'asset/resource',
        generator: {
        filename: '[name][ext]'
      },
    },
    {
      test: /\.html$/,
      type: "asset/resource",
      generator: {
        filename: "[name][ext]",
      },
    },
    // {
    //   test: /\.html$/i,
    //   loader: "html-loader",
    // },
    {
      test: /\.(png|svg|jpg|jpeg|gif)$/i,
      type: 'asset/resource',
    },
    {
      test: /\.json$/,
      type: 'asset/resource',
        generator: {
        filename: '[name][ext]'
      },
    },
  ]
}

module.exports = [
  {
    devtool: devtool,
    mode: mode,
    entry: {
      'background' : path.resolve(__dirname, 'src', 'background', 'background.js'),
      'popup' : path.resolve(__dirname, 'src', 'popup', 'popup.js'),
      'settings' : path.resolve(__dirname, 'src', 'settings', 'settings.js'),
      'trust-dialogue' : path.resolve(__dirname, 'src', 'background', 'ui', 'trust-dialogue', 'trust-dialogue.js'),
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: '[name].js',
      assetModuleFilename: "[name][ext]",
    },
    plugins: [
      new TransformJson({
        source: path.resolve(__dirname, 'src', 'manifest.json'),
        filename: 'manifest.json',
        object: {
          description: package.description,
          version: package.version
        }
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'src', 'icons') },
          // { from: path.resolve(__dirname, 'static', 'html') },
        ]
      })
    ],
    resolve: _resolve,
    module: _module
  },
]
