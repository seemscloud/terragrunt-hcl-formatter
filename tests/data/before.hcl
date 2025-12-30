 include  {
       path   =   find_in_parent_folders()
    }
 
 terraform   {
      source    =   "git::ssh://example.com/terraform/module.git//.?ref=v1"
 }
 
 inputs   =   {
 
   simple   =   {
 
      1000   =   {
  
         name  =  "Demo / Example / Service A (:443)"
        status =  "ENABLED"
          period   =  "EVERY_MINUTE"
     uri  =  "https://service-a.example.com/healthz"
            type   =  "BROWSER"
      runtime_type_version   =  "100"
    runtime_type  =  "CHROME_BROWSER"
      script_language  =  "JAVASCRIPT"
    validation_string  =  "ok"
          enable_screenshot_on_failure_and_script  =  true
 
 
        locations_private   =   [
 
              dependency.private_locations.outputs.locations [
   "Location A"
   ]
 .id
   ]
 
      tags  =  [
 
        {
    key  =  "Source", values = [
        "Location A"
 ]
 }
 ,
        {
     key =  "Target", values  = [
      "https://service-a.example.com/healthz"
]
 }
 ,
        {
          key = "Environment", values  = [
      "Test"
 ]
 }
 ,
        {
           key = "Owner", values  = [
    "Team"
 ]
 }
 ,
        {
  key = "Type", values = [
   "Internal"
 ]
 }
 ,
        {
   key = "Project", values  = [
     "Example"
 ]
 }
 ,
        {
      key = "Name", values = [
           "Service A"
 ]
 }
 ,
 ]
 }
 
 
      1001   =   {
 
        name  =  "Demo / Example / Service B (:443)"
      status   =   "ENABLED"
         period   =  "EVERY_MINUTE"
  uri  =  "https://service-b.example.com"
 
        locations_private   =   [
 
    dependency.private_locations.outputs.locations [
 "Location A"
 ]
 .id
        ]
 
      tags = [
 
      {
  key  =  "Source", values = [
  "Location A"
 ]
 }
 ,
      {
       key = "Target", values = [
   "https://service-b.example.com"
 ]
 }
 ,
      {
         key = "Environment", values = [
    "Test"
 ]
 }
 ,
      {
        key = "Owner", values = [
          "Team"
]
 }
 ,
      {
 key = "Type", values = [
      "Internal"
]
 }
 ,
      {
    key = "Project", values = [
  "Example"
]
 }
 ,
      {
         key = "Name", values = [
  "Service B"
]
 }
 ,
 ]
 }
 
 }
 
 
   simple_public  =  {}
 
 }
 
 dependency   "private_locations"   {
    config_path  =  "../../../private-locations"
 
     mock_outputs  =  {
 
       locations  =  {
 
         "Location A"  =  "ID"
    }
 
   }
 }
