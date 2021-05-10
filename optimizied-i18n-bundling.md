
# introduction

- Hello, I'm Robby Polana <@rpolana> - working @ sqsp doing front-end development on #member-accounts past ~2 years

- We use webpack to compile our modules into bundles and modern es6 javascript, jsx to es5 among a quite few other thing

- One of other things we use webpack for; is delivering individually bundled assets for 5 other unique locales, (portuguese italian german french and spanish)

- Bundling locales is accomplished by essentially running webpack for _every single locale_ (more specifically exporting an array from the webpack config)

- Running webpack for every locale is great because the implementation is simple. For everyone locale you are creating an exclusive distinct bundle by trimming out 'chunks' (pieces of a webpack bundle) which are not apart of that locale. For instance your italian bundle should not include french or german chunks etc -- This mechanism is called the ContextReplacementPlugin; more on that later;

- How do these chunks get included in the first place? What is italian specific locale data doing with german or french translations and formatting?

## background on require(...) - commonjs module syntax

- Modern javascript uses modules to manage dependencies, gone are the days of relying on the ordering of script tags to properly load your dependencies.

- Modules give us encapsulation, reusability, distinct declarations of dependencies on other modules, and proper ordering of instantiation and execution.

- One of the most common module syntax today is `require` - or the commonjs module specification. This syntax is widely used today particularly on Nodejs.
- (a new syntax exist which will likely supplant `require`, import or es6 module syntax;)

- In `require` commonjs modules are loaded synchronously. Modules _may also_ be resolved dynamically or in other words resolved at runtime - for example,

  ```js
  var loader = function loader(language) {
    return require("../../../packs/" + language + ".json");
  ```

- In server side NodeJS (the most common commonjs implementation), this is not an issue since you can synchronously read from the file system without much or virtually any latency.

- (If behind the scenes this went the asynchronous route you would have to use a callback or promise, thus affecting the calling code)

- for the frontend client side browser, whose resource access is limited to transferal over network layer; which has a good deal of latency, rather than a file system. There is a little trick webpack uses to accomplish both a synchronous module `require` _and dynamic resolution_

- Include the whole file system in the bundle! (Kind of but not really.)

- In the above example, webpack will see you're dynamically resolving a file in the `/packs` directory, therefore it will _include all of packs_

- This example was taken directly from `@sqs/18n-ui`, which "provides i18n utilities for formatting, translating and displaying user interfaces." uses this dynamic synchronous loading and looks like this

- By default webpack would include everything in `@sqs/i18n-ui` packages `../../../packs/` directory, this would result in a needlessly larger total bundle size, there is no need to include an Italian language pack when the consumer's locale is set to German

**This is unless we utilized the previously mentioned ContextReplacementPlugin**

- Since we run wepback for each locale, thus generated a bundle exclusively and individually, we can tell Webpack to only include the _Italian_ locale file or files in `../../../packs/` for the _Italian_ bundle, same for german spanish french and portuguese.

- Our webpack plugin configuration therefore looks like this:

```js
    plugins: [
      new webpack.ContextReplacementPlugin(/@sqs\/i18n-ui\/packs$/, new RegExp(`(${locale}).json$`, 'ig')),
      ...
    ]

```

- These differentiated 'trimmed' bundles are then served discriminately on inbound requests for our `index.html` file.

- So as a user and setting your locale to Italian, we would serve the `index.html` with something like this,

```html
  <html lang="it">
  ...
  <script src="MyApp-it.js" >
```

- for german:

```html
  <html lang="de">
  ...
  <script src="MyApp-de.js" >
```

etc.

# problem

- This solution is common and simple in execution, but doesn't scale well

- We are shipping a complete set of bundles _for every single locale_ rather than just our source and our locale specific code

- As the amount of locales increases so will the amount of bundles

- On top of just the ContextReplacementPlugin happening in our webpack build, there are countless other processes and compilations which take place.

- The resulting production assets are huge, which have lead to uploading timeouts when moving assets to our asset store in the ci pipeline

- This method is problematic in that it has very long build times, upload times, timeouts and out of memory errors.

- Most importantly production builds locally; (sometimes needed for debugging), are either impractically long or nearly impossible as out of memory errors are common


# solution

- We want to be able to provide unique exclusive locales to our users without unnecessarily compiling and shipping duplicating code.

- This can be accomplished by looking further into webpack's require mechanisms

- `require.context`, `require.resolveWeak`, and the not official somewhat of a hack; `__webpack_require__`

- `require.context` traditionally gives you a different set of control on how you do your _dynamic_ imports, you pass it a directory, and then you regex for the files within that directory you want to designate as chunks. `require.context`.

    - The part we're interested in, in `require.context` is that module-designation ability. The third argument, the mode, sync, or eager.  The module type will be 'lazy' as this makes it a lazy loadable chunk, The intention of this functionality is to create asynchronous chunks. But we are interested in at as it will create an individual chunk not included in the current file. 

    - The resulting call looks like this

      ```js
        require.context("./sqs-i18n-translations/strings",true,/.*\.yaml/,'lazy');
      ```

    - Lazy chunk splitting is not limited to code in #member-accounts. We also need to do it in our Squarespace libraries. To accomplish lazy chunk splitting for internal libraries, a patch using `patch-package` library was implemented. The `require.context` above was then included in these libraries. The `require.context` looking nearly identical to the one here.


-  `__webpack_require__` - Is internally what your `require`s get compiled into, this is syntax is used to require something without webpack analyzing it and including a dependency into a bundle. 


- `require.resolveWeak` - This mechanism will _resolve_ your module, or *lookup* the 'path' of a given module, without pulling it into the bundle. `require.resolveWeak` is side-effectless lookup. It only returns the module path, and does nothing else. This is used to come up with a path to pass into `__webpack_require__`


- Here is an example patch being used in `@sqs/i18n-components`

```diff
function translationsLoader(translationLocale) {
-  return require("../../sqs-i18n-translations/strings/".concat(PACKAGE_NAME, ".").concat(translationLocale, ".yaml"));

+  require.context("../../sqs-i18n-translations/strings",true,/.*\.yaml/,'lazy');

+  return __webpack_require__(require.resolveWeak("../../sqs-i18n-translations/strings/".concat(PACKAGE_NAME, ".").concat(translationLocale, ".yaml")));
  }

```

- There is a lazy chunk designation, and a traditional dynamic `require` is being swapped out with `__webpack_require__(require.resolveWeak(...)`




- The fourth piece of the puzzle is gathering all these individual chunks by locale discriminately so it can be served to our user later on in one piece, so all of our libraries and code will have these chunks ready by the time they load.

- `require.context` Separates our locale data into individual chunks. Our locale data is split into individual chunks, but we need a way to group them all by their locale as they exist across multiple libraries. So the source for a given locale across multiple libraries can be loaded on demand.  This is easy to do in a webpack config with its 'splitChunks' mechanism in `webpack.config.js`
      ```js
            splitChunks: {
             cacheGroups: {
              i18n: {
                priority: 10,
                test: /sqs-i18n-translations.strings|@sqs.i18n-ui.packs|moment.locale/,
                chunks: 'all',
                name(module, chunks, cacheGroupKey) {
                  const locale = getModuleLocaleFromName(module);
                  return `i18n-${locale}`;
                },
              },
      ```
    From the module name, which is usually of the form `it.js` or `pt.js` or `de.js` it's pretty easy to figure out which locale they are, so for this example we use a made up function `getModuleLocaleFromName` to do that. (the actual implementation is a bit more involved but this is for the sake of the example). These individual files were made available as individual chunks by `require.context`. 
    
  - Our result then is a *catch all* chunk, 1 chunk for each locale, across multiple libraries. 

  - The resulting locale file will look like: `i18n-it.js` or `i18n-pt.js` or `i18n-de.js`


  -  Since splitting the chunks, has already been taken care of by `require.context` which then got catch all'd into a locale file, it is up to us to include it ourselves. 

  - The 5th final piece of this long winding journey to a better locale story is serving our locale file to the user.

  - The user makes an inbound request to `index.html`, their locale preference is determined on the backend and we insert the locale bundle request as a script tag, first and foremost, ordering is important, as the chunks need to be available to webpack.


- The result is something like this (for german, `de`)



```html
  <html lang="de">
  ...
  <script src="i18-de.js" >
  <script src="app.js" >
  <script src="vendor.js" >
```

Notice, `app` and `vendor` do not have locale designations.


