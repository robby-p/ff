import React from "react";
import ReactDOM from "react-dom";

import {
  Appear,
  Box,
  CodePane,
  CodeSpan,
  Deck,
  FlexBox,
  FullScreen,
  Grid,
  Heading,
  Image,
  ListItem,
  Markdown,
  Notes,
  OrderedList,
  Progress,
  Slide,
  SpectacleLogo,
  Stepper,
  Text,
  UnorderedList,
  indentNormalizer,
} from "spectacle";

// SPECTACLE_CLI_THEME_START
const theme = {
  fonts: {
    header: 'Helvetica, Arial, sans-serif',
    text: 'Helvetica, Arial, sans-serif',
  },
  fontSizes:{

    h1: '44px',
    h2: '36px',
    h3: '28px',
    body: '24px',
    text: '24px',
    bodySmall: '24px'
  }
};
// SPECTACLE_CLI_THEME_END

// SPECTACLE_CLI_TEMPLATE_START
const template = () => (
  <FlexBox
    justifyContent="space-between"
    position="absolute"
    bottom={0}
    width={1}
  >
    <Box padding="0 1em">
      <FullScreen />
    </Box>
    <Box padding="1em">
      <Progress />
    </Box>
  </FlexBox>
);
// SPECTACLE_CLI_TEMPLATE_END

const P = ({ children }) => (children||"").split("\n").map((line) => <p>{line}</p>);
const Presentation = () => (
  <Deck theme={theme} template={template} transitionEffect="fade">
    <Slide>
      <Markdown>
        {`
        # Optimized i18n webpack bundling

        ## by Robby Polana 

          - @rpolana, front-end on #member-accounts
          - webpack webpack webpack webpack
          - bundling locales
            - old way -> compiling and shipping a complete webpack asset bundle for every locale
            - new way -> _not doing that_
      `}
      </Markdown>
      <Notes>
        <P>{`
# introduction

- Hello, I'm Robby Polana @rpolana - working @ sqsp doing front-end development on #member-accounts past ~2 years

- We use webpack to compile our modules into bundles and modern es6 javascript, jsx to es5 among a quite few other thing

- One of other things we use webpack for; is delivering individually bundled assets for 5 other unique locales, (portuguese italian german french and spanish)

- Bundling locales is accomplished by essentially running webpack for _every single locale_ (more specifically exporting an array from the webpack config)

- ? Running webpack for every locale is great because the implementation is simple. For everyone locale you are creating an exclusive distinct bundle by trimming out 'chunks' (pieces of a webpack bundle) which are not apart of that locale. For instance your italian bundle should not include french or german chunks etc -- This mechanism is called the ContextReplacementPlugin; more on that later;

- ? How do these chunks get included in the first place? What is italian specific locale data doing with german or french translations and formatting?
`}</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`

    ## webpack, commonjs and \`require(...)\`       

    - commonjs module syntax
    - In commonjs required modules are loaded *synchronously* 
    - Modules may _also_ be resolved *dynamically* / at runtime - for example:


  \`\`\`js
  var loader = function loader(language) {
    return require("../../../packs/" + language + ".json");
  \`\`\`
      
      `}</Markdown>
      <Notes>
        <P>{`
        - Modern javascript uses modules to manage dependencies, gone are the days of relying on the ordering of script tags to properly load your dependencies.

        - Modules give us encapsulation, reusability, distinct declarations of dependencies on other modules, and proper ordering of instantiation and execution.
        
        - One of the most common module syntax today is require - or the commonjs module specification. This syntax is widely used today particularly on Nodejs.
        - (a new syntax exist which will likely supplant require, import or es6 module syntax;)
        
        
        - ? In server side NodeJS (the most common commonjs implementation), this is not an issue since you can synchronously read from the file system without much or virtually any latency.
        
        - ? (If behind the scenes this went the asynchronous route you would have to use a callback or promise, thus affecting the calling code)
        
        - ? for the frontend client side browser, whose resource access is limited to transferal over network layer; which has a good deal of latency, rather than a file system. There is a little trick webpack uses to accomplish both a synchronous module require _and dynamic resolution_
        
        - ? In the above example, webpack will see you're dynamically resolving a file in the \`/packs\` directory, therefore it will _include all of packs_
        `}</P>
      </Notes>
    </Slide>
    <Slide>
      <Markdown>{`

        ## Webpack dynamic requires 'trick'

        - Include everything, so file is available at runtime

          \`\`\`js
          var loader = function loader(language) {
            return require("../../../packs/" + language + ".json");
          \`\`\`
        
        - Everything in \`../../../packs/\` gets included in resulting bundle
        
        `}</Markdown>
      <Notes>
        <P></P>
      </Notes>
    </Slide>
    <Slide>
      <Markdown>{`
        ## Unless...

        - Webpack ContextReplacementPlugiun

      \`\`\`js
          plugins: [
            new webpack.ContextReplacementPlugin(/@sqs\/i18n-ui\/packs$/, new RegExp(\`(\$\{locale}).json$\`, 'ig')),
            ...
          ]

      \`\`\`
      
      `}</Markdown>
      <Notes>
        <P>{`
            - Since we run wepback for each locale, thus generated a bundle exclusively and individually, we can tell Webpack to only include the _Italian_ locale file or files in ../../../packs/ for the _Italian_ bundle, same for german spanish french and portuguese.

            - These differentiated 'trimmed' bundles are then served discriminately on inbound requests for our html file.

            - So as a user and setting your locale to Italian, we would serve the html with something like this,
          
          `}</P>
      </Notes>
    </Slide>
    <Slide>
      <Markdown>{`

          ## Italian locale example
            \`\`\`html
              <html lang="it">
              ...
              <script src="MyApp-it.js" >
              <script src="Vendor-it.js" >
              <script src="SomethingElse-it.js" >
            \`\`\`

            - 🍕

      
      `}</Markdown>
      <Notes>
        <P>{`Each locale bundle only serves its locale, other locales get excluded`}</P>
      </Notes>
    </Slide>
    <Slide>
      <Markdown>{`
            ## Problems

            - As the amount of locales increases so will the amount of bundles
            - The resulting production assets are huge
            - long build times, upload times, timeouts and out of memory errors.
            - difficulty running prod build locally


      
      `}</Markdown>
      <Notes>
        <P>{
          `
          - This solution is common and simple in execution, but doesn't scale well

- We are shipping a complete set of bundles _for every single locale_ rather than just our source and our locale specific code

- As the amount of locales increases so will the amount of bundles

- On top of just the ContextReplacementPlugin happening in our webpack build, there are countless other processes and compilations which take place.

- The resulting production assets are huge, which have lead to uploading timeouts when moving assets to our asset store in the ci pipeline

- This method is problematic in that it has very long build times, upload times, timeouts and out of memory errors.

- Most importantly production builds locally; (sometimes needed for debugging), are either impractically long or nearly impossible as out of memory errors are common
`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## The end goal

            -  We want to be able to provide unique exclusive locales to our users without unnecessarily compiling and shipping duplicated code.

            - Vendor.js and MyApp.js should be re-used across locales
      
      `}</Markdown>
    </Slide>

    <Slide>
      <Markdown>{`
            ## Multipart Part Solution

            - Requirers; \`require.context\`, \`require.resolveWeak\`, and the un-official somewhat of a hack; \`__webpack_require__\`
            
            - Webpack's splitChunk configuration

            - Load locale catch-all chunk
            
            \`\`\`html

                  <html lang="it">
                  ...
                  <script src="i18-it.js">
                  <script src="app.js">
                  <script src="vendor.js">

            \`\`\`


      
      `}</Markdown>
      <Notes>
        <P>{
          `

- This can be accomplished by looking further into webpack's require flavors, \`require.context\`, \`require.resolveWeak\`, and the not official somewhat of a hack; \`__webpack_require__\`
- These requires are used to split up locales into individual async loadable chunks as well as load them during our run-time

- webpack Split chunk is used to gather all of these individual chunks and group them, so they can be loaded via script tags in html
`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## require.context 


            \`\`\`js
            require.context(
                "./sqs-i18n-translations/strings",true,/.*\.yaml/,"lazy"
            );
            \`\`\`
      
      `}</Markdown>
      <Notes>
        <P>{
          `


- require.context traditionally gives you a different set of control on how you do your _dynamic_ imports, you pass it a directory, and then you regex for the files within that directory you want to designate as chunks. require.context.

  - The part we're interested in, in require.context is that module-designation ability. The third argument, the mode, sync, or eager. The module type will be 'lazy' as this makes it a lazy loadable chunk, The intention of this functionality is to create asynchronous chunks. But we are interested in at as it will create an individual chunk not included in the current file.

  - The resulting call looks like this
  
  - This is also patched into sqsp libraries, so its locale dependencies have that async designation as well

`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## \`\_\_webpack_require\_\_\`

              - internally what your requires get compiled into
              - Hide from webpack
      
      `}</Markdown>
      <Notes>
        <P>{
          `


      - Is internally what your requires get compiled into, this is syntax is used to require something without webpack analyzing it and including a dependency into a bundle.
      - used to hide our require from webpack, so webpack doesn't get smart and include locale bundles we dont want it

`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## require.resolveWeak

              - lookup a module path without including it 
              - passed to \_\_webpack_require\_\_
      
      `}</Markdown>
      <Notes>
        <P>{
          `

- require.resolveWeak - This mechanism will _resolve_ your module, or _lookup_ the 'path' of a given module, without pulling it into the bundle. 
- require.resolveWeak is side-effectless lookup. It only returns the module path, and does nothing else. This is used to come up with a path to pass into __webpack_require__


`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## All together 

            - Example patch;
                
            \`\`\`js
                      function translationsLoader(translationLocale) {
                      //  return require("../../sqs-i18n-translations/strings/".concat(PACKAGE_NAME, ".").concat(translationLocale, ".yaml"));

                      //Split into lazy loadable locale chunks, which get grouped by webpack spitchunks
                      require.context("../../sqs-i18n-translations/strings",true,/.*\.yaml/,'lazy');

                        //load these chunks without triggering any webpack bundling
                        return __webpack_require__(require.resolveWeak("../../sqs-i18n-translations/strings/".concat(PACKAGE_NAME, ".").concat(translationLocale, ".yaml")));
                        }
              \`\`\`

      
      `}</Markdown>
      <Notes>
        <P>{
          `

                    - example patch for illustrations, strategy also used for local src.

                      - Split into lazy loadable locale chunks, which get grouped by webpack spitchunks

                      - load these chunks without triggering any webpack bundling


`
          }</P>
      </Notes>
    </Slide>

    <Slide>
      <Markdown>{`
            ## The final step

                
            \`\`\`html

                  <html lang="it">
                  ...
                  <script src="i18n-it.js" >
                  <script src="MyApp.js" >
                  <script src="Vendor.js" >
              \`\`\`


               - \`i18n-it.js\` must be loaded first
      
      `}</Markdown>
      <Notes>
        <P>{
          `

  - The user makes an inbound request to index.html, their locale preference is determined on the backend and we insert the locale bundle request as a script tag, first and foremost, ordering is important, as the chunks need to be available to webpack.
  - MyApp and Vendor will be the same for all locales
  - split chunks has collected our bundles and put them into i18n-it.js

  - i18n-it.js is loaded first, this split chunk was created, bundled out of band. It must be available to its dependencies before they ask for it.


`
          }</P>
      </Notes>
    </Slide>
  </Deck>
);

ReactDOM.render(<Presentation />, document.getElementById("root"));
