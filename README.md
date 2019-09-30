# mod-assessment

a back-end FOLIO module for assessment

## Configuration

Modify `src/config.json` to configure the module for your system.

## Deploying to Okapi

```shell
npm run okapi-deploy
```

## Development

### Installing Dependencies

```shell
npm install

```

### Compiling and Starting

```shell
npm run develop
```

This script uses [nodemon](https://github.com/remy/nodemon) to automatically recompile and restart the application whenever a change is made to a file in the `src` directory. You can also use `npm run compile` and `npm start` to manually compile and start the application, respectively.

## TODO

* Write tests.
* Extract parameter validation to middleware.
