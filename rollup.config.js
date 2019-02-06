/* @flow strict */

import babel from 'rollup-plugin-babel'

const pkg = require('./package.json')

export default {
  input: './session-resume.js',
  output: [
    {
      file: pkg['module'],
      format: 'es'
    },
    {
      file: pkg['main'],
      format: 'umd',
      name: 'sessionResume'
    }
  ],
  plugins: [
    babel({
      plugins: ['@babel/plugin-proposal-class-properties'],
      presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        '@babel/preset-flow'
      ]
    })
  ]
}
