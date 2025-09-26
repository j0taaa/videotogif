# videotogif

This project is for a demo of Huawei Cloud's CCE and CCI. 

There are going to be two container images, one for the frontend server of this application and another for the jobs that are going to be used

The application is going to be a server that recieves video files and convert them to gifs, saves them, and them returns the link for download

The frontend is going to be made using Next.js and the image will be deployed in CCE

The converter part is going to run on CCI as jobs and it will recieve the video, will convert it using ffmpeg, will save the result to OBS and will return a link to download to the frontend
