from datetime import timedelta

def compute_date_based_prices(
  start_date, end_date, base_rate, passenger_rate_add, pricing_rules, 
  booking_number_dict, blackout_dates, demand_threshold=4, demand_step_percent=5
):
  dates_prices_dict = {}
  price_adjust_dict = {}
  current_date = start_date

  while current_date <= end_date:
      adjustment_text = ""
      price = base_rate

      for rule in pricing_rules:
          if rule["datestart"]  <= current_date <= rule["dateend"]:
              if rule["percentadjustment"] is not None:
                  percent_factor = ((100 + int(rule['percentadjustment'])) / 100)
                  price = round(price * percent_factor)
                  adjustment_text += f"{rule['percentadjustment']}% increase (rule {rule['ruleID']})."
              elif rule["priceadjustment"] is not None:
                  price += int(rule['priceadjustment'])
                  adjustment_text += f"${rule['percentadjustment']} increase (rule {rule['ruleID']})."

      # Add per person passenger rate adjustment
      adjustment_text += "Passenger Count increases rate by $" + str(passenger_rate_add)

      # Add demand-based (4 or more) price increase
      date_str = current_date.strftime('%Y-%m-%d')
      booking_num = booking_number_dict.get(date_str, 0)

      if booking_num > demand_threshold:
          demand_increase_factor = 1 + (((booking_num - demand_threshold) * 5) / 100)  # percent increase to calculate
          price = round((price + passenger_rate_add) * demand_increase_factor)
          adjustment_text += f"Demand-based increase in rate by {(booking_num - demand_threshold) * 5}%"
      else:
          price = round(price + passenger_rate_add)

      #Handle blackout dates
      if date_str in blackout_dates:
          dates_prices_dict[date_str] = 'N/A'
      else:
          dates_prices_dict[date_str] = price
          
      price_adjust_dict[date_str] = adjustment_text    
      current_date += timedelta(days=1)                      
      
  return dates_prices_dict, price_adjust_dict


def get_passenger_price_addl(passengers, addlpassengertype):
    if addlpassengertype == 1:
        print(f"addl passenger type 1 CHECK passengers{passengers}")
        if passengers == "11+":
            addlprice = 9999
        elif int(passengers) < 3: # No additional for 1-2
            addlprice = 0
        elif 3 <= int(passengers) < 5: # $10 additional for 3-4
            addlprice = 10
        elif 5 <= int(passengers) < 7: # $20 additional for 5-6
            addlprice = 30
        elif 7 <= int(passengers) < 9: # $30 additional for 7-8
            addlprice = 60
        elif 9 <= int(passengers) < 11: # $30 additional for 7-8
            addlprice = 100
        elif 11 <= int(passengers):
            addlprice = 9999
        else:
            return("error in finding additional passenger rate")
        print(f"addl price {addlprice}")

    elif addlpassengertype == 2:
        print("addl passenger type 2 CHECK")
        if passengers == "11+":
            addlprice = 9999
        elif int(passengers) < 3: # No additional for 1-2
            addlprice = 0
        elif 3 <= int(passengers) < 5: # $10 additional for 3-4
            addlprice = 30
        elif 5 <= int(passengers) < 7: # $20 additional for 5-6
            addlprice = 40
        elif 7 <= int(passengers) < 9: # $30 additional for 7-8
            addlprice = 80
        elif 9 <= int(passengers) < 11: # $30 additional for 7-8
            addlprice = 120
        elif 11 <= int(passengers):
            addlprice = 9999
        else:
            return("error in finding additional passenger rate")
        print(f"addl price {addlprice}")

    elif addlpassengertype == 3:
        addlprice = 0

    return addlprice