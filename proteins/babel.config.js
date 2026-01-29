module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',          // relative to project root
        safe: false,           // set to true if using .env.example
        allowUndefined: true,  // allows variables to be undefined
      }]
    ]
  };
};
