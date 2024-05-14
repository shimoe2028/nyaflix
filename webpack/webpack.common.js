const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const srcDir = path.join(__dirname, '..', 'src');

const env = process.env.NODE_ENV;

require('dotenv').config({ path: `./${env === 'development' ? '.env.dev' : '.env'}` });

module.exports = {
  entry: {
    popup: path.join(srcDir, 'popup/popup.tsx'),
    options: path.join(srcDir, 'options/options.tsx'),
    'html5-player-setup': path.join(srcDir, 'content-scripts/html5-player-setup.ts'),
    'netflix-player-setup': path.join(srcDir, 'content-scripts/netflix-player-setup.ts'),
    'netflix-player-inject': path.join(srcDir, 'injected-scripts/netflix-player-inject.ts'),
    'join-setup': path.join(srcDir, 'content-scripts/join-setup.ts'),
    background: path.join(srcDir, 'background/background.ts'),
  },
  output: {
    path: path.join(__dirname, '../dist/js'),
    filename: '[name].js',
  },
  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks(chunk) {
        return (
          chunk.name !== 'html5-player-setup' &&
          chunk.name !== 'netflix-player-setup' &&
          chunk.name !== 'netflix-player-inject' &&
          chunk.name !== 'join-setup' &&
          chunk.name !== 'background'
        );
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'public/manifest.json',
          to: '../manifest.json',
          transform(content, path) {
            return applyEnvToManifest(content);
          },
        },
        {
          from: '.',
          to: '../',
          context: 'public',
          globOptions: {
            ignore: ['**/manifest.json'],
          },
        },
      ],
      options: {},
    }),
    new Dotenv({
      path: `./${env === 'dev' ? '.env.dev' : '.env'}`,
    }),
  ],
  cache: {
    type: 'filesystem',
  },
};

function applyEnvToManifest(buffer) {
  const manifest = JSON.parse(buffer.toString());

  function replaceEnvVariables(obj) {
    for (let key in obj) {
      if (typeof obj[key] === 'object') {
        replaceEnvVariables(obj[key]);
      } else if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\$\{(.*?)\}/g, (match, envVar) => {
          return process.env[envVar] || match;
        });
      }
    }
  }

  replaceEnvVariables(manifest);
  const manifestJson = JSON.stringify(manifest, null, 2);
  return manifestJson;
}
