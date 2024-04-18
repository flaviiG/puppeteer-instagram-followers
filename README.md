# Getting the followers list of your account

## Create config.env file in the root directory and create these env variables:

### Provide username and password for the Instagram account you want to scrape with

```
    INSTAGRAM_USERNAME=%your_username%
    INSTAGRAM_PASSWORD=%your_password%
```

If you want to use a proxy server create these env variables:

```
    PROXY_USERNAME=%your_proxy_username%
    PROXY_PASSWORD=%your_proxy_password%
    PROXY_SERVER=%your_proxy_server%
```

## Run index.js

username_to_scrape is the user you want to get the followers list from

```
    npm i

    node index.js %username_to_scrape%

```

## Result

The followers list will be created at ./followers.json

## Running in a Docker container

### Create the image

```
    docker build -t followers-image .
```

### Run the container

```
    docker run --name followers-container --network=host followers-image %username_to_scrape%
```

### Get the followers list

```
    docker cp followers-container:/app/followers.json ./followers.json
```
