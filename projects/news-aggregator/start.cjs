const path = require('path')
require('dotenv').config({ override: true, path: path.resolve(__dirname, '.env') })
import('./dist/index.js')
