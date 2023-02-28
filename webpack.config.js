const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TransformJson = require('transform-json-webpack-plugin')
const package = require('./package.json')

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
          { from: path.resolve(__dirname, 'static', 'icons') },
          // { from: path.resolve(__dirname, 'static', 'html') },
        ]
      })
    ],
    resolve: _resolve,
    module: _module
  },
]
