# RailBoard

![Image of RailBoard, with an interactive map on the right-hand side, and a list of departure times on the left-hand side of the website](https://cdn.hackclub.com/01a0e280-7a63-753a-93b0-e55adb58915e/railboard-thumbnail.png)

Departure board integrated into a website that displays live train times using open-source train data in Victoria, Australia sourced from [Open Data Victoria](https://opendata.transport.vic.gov.au/). Uses Python for backend and HTML, CSS, and JS for frontend stack. Features side map with realtime positions of trains, divided by Metro (Metropolitan region of Melbourne, Victoria), and V/Line (Rural towns and cities in Victoria).

## Development

1. Clone the code to your device

```
git clone https://github.com/VihaanVinoth/railboard.git && cd railboard
```

2. Install the dependencies

```
pip install -r requirements.txt
```

3. Create .env file for the train API

Go to https://opendata.transport.vic.gov.au and sign up, and then go to Profile (click on profile picture -> Profile), then simply copy the API key, then go into the project, create a .env file, and set it like this:

```
TRANSPORT_VIC_KEY=YOUR_API_KEY
```

4. Start the development server on `localhost:8000`

```
gunicorn app:app
```

## Additional Notes

- If you don't complete step 3 (creating .env and getting API key), then the train timing and map won't work properly
- Using a venv (Virtual Environment) is most ideal if you are creating a local development server
- If you want to use a web server like Render, then you can set them like this (ensure that .env is created):
    - Type: Web Server
    - Build Command: ```pip install -r requirements.txt```
    - Start Command: ```gunicorn app:app```
    - Environment Key: Go to the Environment tab on the sidebar, and set it like ```TRANSPORT_VIC_KEY=YOUR_API_KEY```
