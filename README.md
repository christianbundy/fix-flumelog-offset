# fix-flumelog-offset

> repair flumelog offset to remove corrupt entries

This should be your last resort for fixing your flumelog, and *does not* delete
your flumeviews. It works by copying all valid flumelog entries to a temporary
file and then replacing your flumelog with the contents of that file.

## Usage

```javascript
Usage: fix-flumelog-offset [options]

Options:
  --help     Show help                                        [boolean]
  --version  Show version number                              [boolean]
  --path     database path
                [string] [default: "/home/alice/.ssb/flume/log.offset"]
```

## Installation

With [npm](https://npmjs.org/):

```shell
npm install -g fix-flumelog-offset
```

With [yarn](https://yarnpkg.com/en/):

```shell
yarn global add fix-flumelog-offset
```

## License

AGPL
