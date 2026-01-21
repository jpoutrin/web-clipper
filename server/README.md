# Welcome to Buffalo

Thank you for choosing Buffalo for your web development needs.

## Database Setup

It looks like you chose to set up your application using a database! Fantastic!

The server uses a `database.yml` configuration file that includes important SQLite optimizations like connection pooling, WAL mode, foreign key enforcement, and busy timeout settings.

**Configuration file locations:**
- Development: `./database.yml` (in the project directory)
- Production: `/etc/web-clipper/database.yml` (installed by the package)

The server automatically searches both locations, so no environment variables are needed.

Open the `database.yml` file and edit it to use the correct settings for your environment if needed. For SQLite (the default), the production configuration already includes recommended optimizations.

### Create Your Databases

Ok, so you've edited the "database.yml" file and started your database, now Buffalo can create the databases in that file for you:

```console
buffalo pop create -a
```

## Starting the Application

Buffalo ships with a command that will watch your application and automatically rebuild the Go binary and any assets for you. To do that run the "buffalo dev" command:

```console
buffalo dev
```

If you point your browser to [http://127.0.0.1:3000](http://127.0.0.1:3000) you should see a "Welcome to Buffalo!" page.

**Congratulations!** You now have your Buffalo application up and running.

## What Next?

We recommend you heading over to [http://gobuffalo.io](http://gobuffalo.io) and reviewing all of the great documentation there.

Good luck!

[Powered by Buffalo](http://gobuffalo.io)
