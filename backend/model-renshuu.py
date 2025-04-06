import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib

data = pd.read_csv("backend/data/earthquakes.csv")

# filter the data to only include the data relevant to Japan
data = data[
    (data['latitude'] >= 24) & (data['latitude'] <= 46) &
    (data['longitude'] >= 122) & (data['longitude'] <= 146)
]
# drop rows with missing values
data = data.dropna()

X = data[['latitude', 'longitude']] # define the input variables
y = data['mag'] # define the output variable

# train the model so that it comes up with a mathematical formula that expresses magnitude
# as a function of latitude and longitude
model = LinearRegression()
model.fit(X, y)

joblib.dump(model, "backend/model/model.pkl") # save the model
