const path = require('path');

const isProduction = process.env.NODE_ENV == 'production';

const config = {
  entry: './client/index.jsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  plugins: [
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/i,
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-react']
        }
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: 'asset',
      },
    ],
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';    
  } else {
    config.mode = 'development';
  }
  return config;
};
