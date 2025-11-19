const path = require('path');

/** @type {import('webpack').Configuration[]} */
module.exports = [
  // Extension host configuration (Node.js context)
  {
    name: 'extension',
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    externals: {
      vscode: 'commonjs vscode' // VSCode API is external
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [{
            loader: 'ts-loader'
          }]
        }
      ]
    },
    devtool: 'source-map'
  },
  
  // Webview configuration (Browser context for React)
  {
    name: 'webview',
    target: 'web',
    mode: 'none',
    entry: './webview-src/studio/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'studio.js'
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [{
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, 'webview-src', 'tsconfig.json')
            }
          }]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    devtool: 'source-map',
    performance: {
      hints: false
    }
  }
];
