import * as faker from 'faker';
import { DataSource, ModelBuilder } from 'loopback-datasource-juggler';

import obfuscator = require('../src/obfuscator');

describe('Obfuscator mixin', () => {
  let User: any;
  let UserWithMixinProperties: any;
  let memory: any;

  beforeAll(() => {
    const modelBuilder = new ModelBuilder() as any;
    const mixins: any = modelBuilder.mixins;

    mixins.define('Obfuscator', obfuscator);

    memory = new DataSource('db', { connector: 'memory' }, modelBuilder);

    User = memory.createModel(
      'User',
      {
        address: 'string',
        email: { type: 'string', required: true, obfuscated: true },
        firstName: { type: 'string', obfuscated: true },
        language: 'string',
        lastName: { type: 'string', obfuscated: true },
      },
      {
        mixins: {
          Obfuscator: {
            salt: faker.random.alphaNumeric(10),
          },
        },
        strict: false,
      }
    );

    UserWithMixinProperties = memory.createModel(
      'UserWithMixinProperties',
      {
        address: 'string',
        email: { type: 'string', required: true },
        firstName: { type: 'string' },
        language: 'string',
        lastName: { type: 'string' },
      },
      {
        mixins: {
          Obfuscator: {
            properties: ['email', 'firstName', 'lastName'],
            salt: faker.random.alphaNumeric(10),
          },
        },
        strict: false,
      }
    );
  });

  afterEach(async () => {
    await User.destroyAll();
    await UserWithMixinProperties.destroyAll();
  });

  test('obfuscate properties', async () => {
    const data = { email: faker.internet.email() };
    const user = await User.create(data);
    expect(user.id).toBeDefined();
    expect(user.email).toEqual(data.email);
    const instance = await User.findById(user.id, undefined, {
      skipDeobfuscate: true,
    });
    expect(instance).toBeTruthy();
    expect(instance.id).toEqual(user.id);
    expect(instance.email).not.toEqual(data.email);
    const emailObfuscated = User._obfuscate(data.email);
    expect(emailObfuscated).toEqual(instance.email);
  });

  test('deobfuscate properties', async () => {
    const data = { email: faker.internet.email() };
    const user = await User.create(data);
    expect(user.id).toBeDefined();
    expect(user.email).toEqual(data.email);
    const instance = await User.findOne({ where: data });
    expect(instance).toBeTruthy();
    expect(instance.id).toEqual(user.id);
    expect(instance.email).toEqual(data.email);
  });

  describe('Configuration mixin', () => {
    test('dynamic salt without env variable should report error', async () => {
      delete process.env.USER_DYNAMIC_SALT;
      expect(() => {
        memory.createModel(
          'UserDynamicSalt',
          {
            email: { type: 'string', required: true, obfuscated: true },
            firstName: { type: 'string', obfuscated: true },
            language: 'string',
            lastName: { type: 'string', obfuscated: true },
          },
          {
            mixins: {
              Obfuscator: {
                // tslint:disable-next-line:no-invalid-template-strings
                salt: '${USER_DYNAMIC_SALT}',
              },
            },
            strict: false,
          }
        );
      }).toThrowError('Salt not found');
    });

    test('dynamic salt with env variable should be configured', async () => {
      process.env.USER_DYNAMIC_SALT = faker.random.alphaNumeric(10);
      const UserDynamicSalt = memory.createModel(
        'UserDynamicSalt',
        {
          email: { type: 'string', required: true, obfuscated: true },
          firstName: { type: 'string', obfuscated: true },
          language: 'string',
          lastName: { type: 'string', obfuscated: true },
        },
        {
          mixins: {
            Obfuscator: {
              // tslint:disable-next-line:no-invalid-template-strings
              salt: '${USER_DYNAMIC_SALT}',
            },
          },
        }
      );

      const data = { email: faker.internet.email() };
      const user = await UserDynamicSalt.create(data);
      expect(user.id).toBeDefined();
      expect(user.email).toEqual(data.email);
      let instance = await UserDynamicSalt.findById(user.id);
      instance = instance.toJSON();
      expect(instance).toBeTruthy();
      expect(instance.id).toEqual(user.id);
      expect(instance.email).toEqual(data.email);
    });

    test('obfuscate properties configured in mixin options', async () => {
      const data = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
      };
      const user = await UserWithMixinProperties.create(data);
      expect(user.id).toBeDefined();
      expect(user).toMatchObject(data);
      const instance = await UserWithMixinProperties.findById(
        user.id,
        undefined,
        { skipDeobfuscate: true }
      );
      expect(instance).toBeTruthy();
      expect(instance.id).toEqual(user.id);
      expect(instance.email).not.toEqual(data.email);
      expect(instance.firstName).not.toEqual(data.firstName);
      expect(instance.lastName).not.toEqual(data.lastName);
      const obfuscatedData = {
        email: UserWithMixinProperties._obfuscate(data.email),
        firstName: UserWithMixinProperties._obfuscate(data.firstName),
        lastName: UserWithMixinProperties._obfuscate(data.lastName),
      };

      expect(instance).toMatchObject(obfuscatedData);
    });
  });

  describe('Complex where object', () => {
    test('mixed logical operators', async () => {
      const data = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
      };
      const user = await User.create(data);
      expect(user.id).toBeDefined();
      const instance = await User.findOne({
        where: {
          or: [
            {
              and: [{ email: data.email }, { firstName: data.firstName }],
            },
          ],
        },
      });
      expect(instance).toBeTruthy();
      expect(instance.id).toEqual(user.id);
    });

    test('null value', async () => {
      const dataWithFirstName = {
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
      };
      await User.create(dataWithFirstName);

      const data = {
        email: faker.internet.email(),
      };
      const user = await User.create(data);
      expect(user.id).toBeDefined();
      const instance = await User.findOne({
        where: {
          firstName: null,
        },
      });
      expect(instance).toBeTruthy();
      expect(instance.id).toEqual(user.id);
    });

    test('unsupported operators', async () => {
      const data = {
        email: faker.internet.email(),
      };
      const user = await User.create(data);
      expect(user.id).toBeDefined();
      const instance = await User.findOne({
        where: {
          email: { like: data.email },
        },
      });
      expect(instance).toBeNull();
    });

    test('supported operators', async () => {
      const data = {
        email: faker.internet.email(),
      };
      const user = await User.create(data);
      expect(user.id).toBeDefined();
      const instance = await User.findOne({
        where: {
          email: { inq: [data.email] },
        },
      });
      expect(instance).toBeTruthy();
      expect(instance.id).toEqual(user.id);
    });

    test('keep non obfuscated properties conditions on where', async () => {
      await User.create({
        address: faker.address.streetAddress(),
        email: faker.internet.email(),
        language: faker.random.word(),
      });

      const data = {
        address: faker.address.streetAddress(),
        email: faker.internet.email(),
        language: faker.random.word(),
      };
      const user = await User.create(data);
      expect(user.id).toBeDefined();
      const users = await User.find({
        where: {
          address: data.address,
          language: data.language,
        },
      });
      expect(users).toHaveLength(1);
      expect(users[0].id).toEqual(user.id);
    });
  });
});
