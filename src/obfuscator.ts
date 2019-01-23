import * as debugModule from 'debug';
import Hashids from 'hashids';

const debug = debugModule('loopback:mixin:obfuscator');
const DYNAMIC_CONFIG_PARAM = /\$\{(\w+)\}$/;

const LOGICAL_OPERATORS = ['and', 'or', 'nor'];
const WHERE_OPERATORS = ['eq', 'neq', 'inq', 'nin'];

export = (Model: any, options?: any) => {
  options = options || {};
  const { properties } = options;
  const salt = getConfigVariable(options.salt);
  let hashids: Hashids;
  if (typeof salt === 'string') {
    hashids = new Hashids(salt);
  } else {
    throw new Error('Salt not found');
  }

  Model._obfuscatedProperties =
    Array.isArray(properties) && properties.length > 0
      ? properties
      : getObfuscatedProperties();

  if (Model._obfuscatedProperties.length === 0) {
    throw new Error('Obfuscated properties not found.');
  }

  Model.observe('persist', async (ctx: any) => {
    const { data } = ctx;

    for (const property of Model._obfuscatedProperties) {
      if (data[property] !== undefined) {
        const value = ctx.data[property];
        ctx.data[property] = Model._obfuscate(value);
      }
    }
  });

  Model.observe('access', async (ctx: any) => {
    ctx.query.where = buildWhere(ctx.query.where);
  });

  Model.observe('loaded', async (ctx: any) => {
    // tslint:disable-next-line:no-shadowed-variable
    const { data, options } = ctx;
    if (!!options.skipDeobfuscate) {
      return;
    }

    for (const property of Model._obfuscatedProperties) {
      if (data[property] !== undefined) {
        const value = data[property];
        data[property] = Model._deobfuscate(value);
      }
    }
  });

  Model._obfuscate = (text: string | number): string => {
    const hexed = Buffer.from(text.toString()).toString('hex');
    return hashids.encodeHex(hexed);
  };

  Model._deobfuscate = (text: string): string => {
    const hexed = hashids.decodeHex(text);
    return Buffer.from(hexed, 'hex').toString('utf8');
  };

  function buildWhere(where?: any): any {
    if (where === null || typeof where !== 'object') {
      return where;
    }
    const result: any = {};
    for (const key of Object.keys(where)) {
      const cond = where[key];
      if (LOGICAL_OPERATORS.includes(key)) {
        if (Array.isArray(cond)) {
          result[key] = cond.map(c => buildWhere(c));
        }
      }
      if (Model._obfuscatedProperties.includes(key)) {
        // tslint:disable-next-line:prefer-conditional-expression
        if (typeof cond === 'string') {
          result[key] = Model._obfuscate(cond);
        } else if (cond !== null && typeof cond === 'object') {
          const op = Object.keys(cond)[0];
          const resultOp: any = {};
          if (WHERE_OPERATORS.includes(op)) {
            const condValue = cond[op];
            if (Array.isArray(condValue)) {
              resultOp[op] = condValue.map(Model._obfuscate);
            } else if (typeof condValue === 'string') {
              resultOp[op] = Model._obfuscate(condValue);
            } else {
              resultOp[op] = condValue;
            }
          } else {
            // tslint:disable:no-console
            console.log(`Found unknown operator ${op} for variable ${key}`);
            console.log(`List of supported operators ${WHERE_OPERATORS}`);
            // tslint:enable:no-console
          }
          result[key] = resultOp;
        } else {
          result[key] = cond;
        }
      }
    }

    return result;
  }

  function getObfuscatedProperties(): string[] {
    const obfuscatedProperties = [];
    // tslint:disable-next-line:no-shadowed-variable
    const { properties } = Model.definition;
    for (const [key, settings] of Object.entries(properties)) {
      const { obfuscated } = settings as any;
      if (obfuscated) {
        obfuscatedProperties.push(key);
      }
    }

    return obfuscatedProperties;
  }

  function getConfigVariable(param?: string): string | undefined {
    const match = param && param.match(DYNAMIC_CONFIG_PARAM);
    let configVariable: string | undefined = param;
    if (match) {
      const varName = match[1];
      const value = process.env[varName];
      if (value !== undefined) {
        debug(
          'Dynamic Configuration: Resolved via process.env: %s as %s',
          value,
          param
        );
        configVariable = value;
      } else {
        // previously it returns the original string such as "${restApiRoot}"
        // it will now return `undefined`, for the use case of
        // dynamic datasources url:`undefined` to fallback to other parameters
        configVariable = undefined;
        debug(
          'Dynamic Configuration: Cannot resolve variable for `%s`, ' +
            'returned as %s',
          varName,
          configVariable
        );
      }
    }
    return configVariable;
  }
};
