const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const TransformJson = require('transform-json-webpack-plugin')
const package = require('./package.json')

const mode = 'development'

const _resolve = {
    extensions: ['.jsx', '.js'],
    modules: [
        path.resolve(__dirname, 'node_modules'),
        'node_modules'
    ]
}

const _module = {
    rules: [
        // {
        //   test: /\.json$/,
        //   loader: 'json-loader'
        // },
        {
          test: /\.css$/,
          use: [{
            loader: 'style-loader'
          }, {
            loader: 'css-loader'
          }]
        },
        {
          test: /\.der/,
          type: 'asset/resource',
            generator: {
            filename: '[name][ext]'
          },
        },
    ]
}

module.exports = [
    {   // manifest and static
        mode: mode,
        entry: [
          path.resolve(__dirname, 'src', 'manifest.json',)
        ],
        output: {
            path: path.resolve(__dirname, 'build'),
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    { from: "static" },
                ]
            }),
            new TransformJson({
                source: path.resolve(__dirname, 'src', 'manifest.json'),
                filename: 'manifest.json',
                object: {
                  description: package.description,
                  version: package.version
                }
            }),
        ],
    },
    {   // background
      devtool: 'inline-source-map',
      mode: mode,
      entry: [
        path.resolve(__dirname, 'src', 'background', 'index.js')
      ],
      output: {
        path: path.resolve(__dirname, 'build'),
        filename: path.join('background', 'index.js')
      },
      resolve: _resolve,
      module: _module
    },
    {   // settings
        devtool: 'inline-source-map',
        mode: mode,
        entry: [
          path.resolve(__dirname, 'src', 'settings', 'index.js')
        ],
        output: {
          path: path.resolve(__dirname, 'build'),
          filename: path.join('settings', 'index.js')
        },
        resolve: _resolve,
        module: _module
    },
    {   // popup
        devtool: 'inline-source-map',
        mode: mode,
        entry: [
          path.resolve(__dirname, 'src', 'popup', 'index.js')
        ],
        output: {
          path: path.resolve(__dirname, 'build'),
          filename: path.join('popup', 'index.js')
        },
        resolve: _resolve,
        module: _module
    },
]
