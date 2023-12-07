const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
// Load configuration file and environment variables
dotenv.config({ path: ".env" });
const port = process.env.PORT || 3001;
const assignmentRepositoryPath = process.env.ASSIGNMENT_DB_PATH || './assignment_db/repositories';

async function getRepositories() {
    try {
        const allDirectoryFiles = fs.readdirSync(assignmentRepositoryPath);
        const directories = allDirectoryFiles.filter(file => fs.statSync(`${assignmentRepositoryPath}/${file}`).isDirectory());
        const repositories = [];
        for (const directory of directories) {
            const allClassesFiles = fs.readdirSync(`${assignmentRepositoryPath}/${directory}/classes`);
            const repositoryObj = JSON.parse(fs.readFileSync(`${assignmentRepositoryPath}/${directory}/repository.json`));
            const repository = {
                repository: repositoryObj,
                classes: []
            }
            for (const repositoryClass of allClassesFiles) {
                const repositoryClassObj = JSON.parse(fs.readFileSync(`${assignmentRepositoryPath}/${directory}/classes/${repositoryClass}`));
                repository.classes.push(repositoryClassObj);
            }
            repositories.push(repository);
        }
        return repositories;
    } catch (error) {
        console.error(error);
        return []
    }
}
async function createUserRepository(repository) {
    try {
        const result = await axios.post(`http://localhost:${port}/repositories`, { repository: repository.repository });
        await new Promise(resolve => setTimeout(resolve, 100));
        const repositoryData = result.data;
        const repositoryId = repositoryData._id;
        console.log(`Assigned repository: ${repositoryData.projectName}`);

        const userRepositoryId = {
            _id: repositoryData._id,
            name: repositoryData.projectName
        };

        for (const repositoryClass of repository.classes) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses`, { repositoryClass: { name: repositoryClass.name, jDoctorConditions: [] } });
            await new Promise(resolve => setTimeout(resolve, 500));
            const repositoryClassData = result.data;
            const repositoryClassId = repositoryClassData._id;
            console.log(`Assigned repository class: ${repositoryClassData.name}`);
            for (const jDoctorCondition of repositoryClass.jDoctorConditions) {
                const result = await axios.post(`http://localhost:${port}/repositories/${repositoryId}/repositoryClasses/${repositoryClassId}/jdoctorconditions`, { jDoctorCondition: jDoctorCondition });
                await new Promise(resolve => setTimeout(resolve, 100));
                const jDoctorConditionData = result.data;
                const jDoctorConditionId = jDoctorConditionData._id;
                console.log(`Uploaded JDoctorCondition: ${jDoctorConditionData.operation.name}`);
            }
        }
        return userRepositoryId;
    } catch (error) {
        console.error(error);
    }
}

(async function uploadStudents() {
    try{
        console.log("Uploading students...");
        const students_credentials = JSON.parse(fs.readFileSync('sit_students_passwords.json', 'utf8'));
        const repositories = await getRepositories();
        const students = [];
        for (const student of students_credentials) {
            const students_repos = student.repositories.map(r => r.name);
            let filtered_repository = repositories.filter(repository => !students_repos.includes(repository.repository.projectName));
            filtered_repository = filtered_repository.filter(repository => ["CoreNLP", "randoop", "imglib2", "asterisk-java", "github-api"].includes(repository.repository.projectName));
            const randomIndex = Math.floor(Math.random() * filtered_repository.length);
            for (const filteredRepository of filtered_repository) {
                const repositoryId = await createUserRepository(filteredRepository);
                console.log(`Processed student: ${student.email}`);
                console.log(student);
                console.log(repositoryId);
                const result = await axios.post(`http://localhost:${port}/users/${student._id}/assign`, repositoryId);
                await new Promise(resolve => setTimeout(resolve, 500));
                console.log(`Repository added.`)
                students.push(result.data);
            }
        }
        fs.writeFileSync('sit_students_passwords_assignment_add_repo.json', JSON.stringify(students, null, 4), (err) => {
            if (err) {
                console.error(err);
                return;
            }
            console.log("JSON data has been saved.");
        });
    } catch (error) {
        console.error(error);
    }
})();
