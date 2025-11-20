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
  
  // Studio webview configuration (Browser context for React)
  {
    name: 'studio',
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
  },

  // Portal webview configuration (Browser context for React)
  {
    name: 'portal',
    target: 'web',
    mode: 'none',
    entry: './webview-src/portal/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'portal.js'
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
  },

  // Intelligence webview configuration (Browser context for React)
  {
    name: 'intelligence',
    target: 'web',
    mode: 'none',
    entry: './webview-src/intelligence/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'intelligence.js'
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
  },
  {
    name: 'nodeManager',
    target: 'web',
    mode: 'none',
    entry: './webview-src/nodeManager/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'nodeManager.js'
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
