## Deploy steps with ElasticBeanStalk

- eb init -p node.js-22 moana-city --profile personal --region ap-south-1
- eb create moana-city --single --instance_type t2.micro --profile personal --region ap-south-1
