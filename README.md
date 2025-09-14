# Careflow

This project was created for HopHacks 2025.

## Inspiration
The median emergency room wait time in the United States is 2 hours and 42 minutes, taking longer for less severe patients. According to a report by the Maryland Hospital Association, Maryland has some of the worst wait times across the country with the median exceeding 4 hours. At the same time, government cuts threaten to shut down many rural hospitals, hurting those most vulnerable in our community. Over 28 million Americans take more than half an hour just to reach the closest hospital. A third of Americans live in some sort of “healthcare-desert,” lacking access to either pharmacies, primary care, hospitals, hospital beds, trauma centers, or community health centers.

Part of the reason for such long wait times is lack of awareness of other options. Around 20% of ER visits could be avoided by visiting a PCP or Urgent Care instead. Telehealth visits are also a great choice for those 1 in 5 Americans living in rural areas where driving to a hospital may be too far.  Pop-up clinics during busy seasons can also help lower the strain on hospitals. 90% of health care clinic patients make less than double the federal poverty level.

Our goal is to solve this issue by increasing accessibility and awareness of resources to the general public

## What it does
Careflow is a medical care routing application that helps patients find appropriate healthcare facilities based on their symptoms and location. 

### Patient Portal
Acting as an intelligent assistant, Careflow uses Gemini AI to assess user input and route them to the right level of care, emergency rooms for critical issues, urgent care for moderate conditions, and telehealth for minor concerns or if the nearest hospital is too far away. It is also able to use Exa to search for pop-up clinics in the area and telehealth options if recommended or desired.

The set of Emergency Rooms is pre-populated with the Centers for Medicare & Medicaid Services (CMS) dataset. Additionally, Careflow integrates real-time facility data from Supabase with OpenStreetMap listings and uses Geoapify APIs to calculate travel times and distances. Careflow will pull data from its database and other known sources to provide the most accurate information to the patient. Additionally, if there do not exist hospitals in the area, it can expand its search to neighboring zipcodes with the ZIPCodeAPI.

The application displays results on an interactive Leaflet map, ranking facilities by expected total time to admittance (travel plus estimated wait). This serves as a load-balancer for busy hospitals, redirecting traffic to other care providers. Users can search by location, filter by care type, and receive personalized, logistics-aware recommendations tailored to their medical needs.

### Provider Portal
Providers are able to submit clinics and hospitals to the database, especially when a new practice opens up that Careflow is not yet aware of. To aid in this process, they can submit a link which will be analyzed by AI to fill out the text fields to submit. This can then be double checked by the provider.

In addition to this we show providers maps of user requests and what kinds of assistance they are looking for whether that’s pop-up vaccination clinics or better emergency care. This allows providers to choose the locations that will lead to the greatest impact.

## How we built it
### Frontend
 - **next.js, node.js, tailwindcss, shadcn**: Frontend was built using next.js
 - **leaflet.js**: Provide the maps to show hospital locations to patients and hotspots to providers

### Backend
 - **Supabase**: Database
 - **Vercel**: Deployment
 - **Gemini 2.5 Flash**: LLM for chatbot to balance speed and accuracy. Hosted through Vercel AI Gateway + Vercel AI SDK

### Third Party APIs
 - **CMS (Centers for Medicare & Medicaid Services)**: Government data on emergency room locations across the country and provides proxies for waittimes
 - **Geoapify**: Geocoding and routing. Help with plotting and finding travel time from location A to B.
 - **Openstreetmap Overpass API**: Get established hospitals, clinics, and practices in the area
 - **ZIPCodeAPI**: Get neighboring zipcodes within a certain radius of your zipcode
 - **Exa**: Allow LLMs to perform an enhanced web search. Integrated with Gemini 2.5 Flash.

We also took the help from generative AI tools such as Cursor, Claude Code, and Codex to improve our own efficiency.

## Challenges we ran into
One of the biggest challenges was streaming some of our large visual interfaces for our Vercel AI SDK chatbot. One of our most significant features is our Leaflet JS map that shows healthcare providers, which we were able to engineer in a way that it seamlessly blends with the chat and SQL queries to Supabase.

We had a hard time integrating the tools into our AI, such that it could use them, and having an AI that could stream information and display it streaming. We also had a hard time integrating reasoning to the frontend, and overall, creating an AI that could respond back without bugs.

Leaflet JS was also a little challenging to use since the map components tend to load very slowly for more data points you want to visualize. 

Another one of the challenges we found was finding the wait times at hospitals. There is no consistent standard around this and many times the data is not available online to view. While there do exist a few APIs, they are restricted to certain provider networks and require partnership with the provider network. To solve this problem, we rely on government data and user reported activity.

## Accomplishments that we're proud of
We are very proud of learning a lot more about Agentic AI and writing good system prompts that result in great tool-calling and really helpful assistants.

## What we learned
We learned more about Agentic AI, rapid prototyping, and best practices in software development. We also learned how to best prompt LLMs to call relevant tools and work with various APIs.

## What's next for Careflow
We plan to integrate several other tools to make it easier for patients to find healthcare providers. We hope in the future to allow users to directly book appointments on Careflow and show PCP availability, something especially important for rural areas with limited availability.

Additionally, we would like to integrate Careflow to more existing tools. For example, while we use the OpenStreetMap API to search for nearby hospitals, we can expand it to include pharmacies and other medical facilities with OpenStreetMap’s ArcGIS Feature Layer for medical facilities in North America.

We also want to expand how the wait times at hospitals are determined, either by having hospitals directly report to our system or improving web scraping capabilities to pull more information off of hospital websites. We can also set up agent callers to determine waiting times at hospitals for when the information is not available online.

Lastly, we would like to integrate Careflow with insurance providers to provide accurate estimates of cost and find the best hospital so patients can get the care they need without worrying if they will be able to afford it.
