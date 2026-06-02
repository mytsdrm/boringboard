// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
const path = require('path');

const tsTransformer = require('@formatjs/ts-transformer');
const CopyPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');

const outpath = path.resolve(__dirname, 'pack');

function makeCommonConfig() {
    const commonConfig = {
        target: 'web',
        mode: 'development',
        node: {
            __dirname: false,
            __filename: false,
        },
        module: {
            rules: [
                {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false,
                    },
                },
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: 'ts-loader',
                        options: {
                            getCustomTransformers: {
                                before: [
                                    tsTransformer.transform({
                                        overrideIdFn: '[sha512:contenthash:base64:6]',
                                        ast: true,
                                    }),
                                ],
                            },
                        },
                    },
                    exclude: [/node_modules/],

                },
                {
                    test: /\.html$/,
                    type: 'asset/resource',
                },
                {
                    test: /\.s[ac]ss$/i,
                    use: [
                        'style-loader',
                        'css-loader',
                        'sass-loader',
                    ],
                },
                {
                    test: /\.css$/i,
                    use: [
                        'style-loader',
                        'css-loader',
                    ],
                },
                {
                    test: /\.(tsx?|js|jsx|mjs|html)$/,
                    use: [
                    ],
                    exclude: [/node_modules/],
                },
                {
                    test: /\.(eot|tiff|svg|woff2|woff|ttf|png|jpg|jpeg|gif)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'static/[name][ext]',
                    },
                },
            ],
        },
        resolve: {
            alias: {
                'react-icons/fa$': path.resolve(__dirname, 'node_modules/@draft-js-plugins/emoji/node_modules/react-icons/fa/index.esm.js'),
                'react-icons/fa/index.esm.js$': path.resolve(__dirname, 'node_modules/@draft-js-plugins/emoji/node_modules/react-icons/fa/index.esm.js'),
            },
            modules: [
                'node_modules',
                path.resolve(__dirname),
            ],
            fullySpecified: false,
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        plugins: [
            new CopyPlugin({
                patterns: [
                    {from: path.resolve(__dirname, 'static'), to: 'static'},
                ],
            }),
            new HtmlWebpackPlugin({
                inject: true,
                title: 'BoringBoard',
                chunks: ['main'],
                template: 'html-templates/page.ejs',
                filename: 'index.html',
                publicPath: '{{.BaseURL}}/',
                hash: true,
            }),
        ],
        entry: ['./src/main.tsx', './src/userSettings.ts'],
        output: {
            library: 'BoringBoard',
            filename: 'static/[name].js',
            path: outpath,
        },
    };

    return commonConfig;
}

module.exports = makeCommonConfig;
